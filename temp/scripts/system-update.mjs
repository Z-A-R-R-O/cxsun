import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseEnv } from "node:util";

const scriptRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const jsonMode = args.includes("--json");
const command = args.find((arg) => !arg.startsWith("--")) ?? "status";
const defaultGitUrl = "https://github.com/sundar-aaran/cxnext.git";

function loadEnv(root = scriptRoot) {
  const envPath = path.join(root, ".env");
  const fileEnv = existsSync(envPath)
    ? Object.fromEntries(
        Object.entries(parseEnv(readFileSync(envPath, "utf8"))).filter((entry) => entry[1] !== undefined),
      )
    : {};
  return { ...fileEnv, ...process.env };
}

const env = loadEnv();
const deployDir = path.resolve(env.DEPLOY_DIR || scriptRoot);
const gitUrl = env.GIT_URL || defaultGitUrl;
const gitBranch = env.GIT_BRANCH || "main";
const composeFile = env.COMPOSE_FILE || ".container/docker-compose.yml";
const appContainerName = env.APP_CONTAINER_NAME || "cxnext-app";
const backupDir = path.resolve(env.SYSTEM_UPDATE_BACKUP_DIR || path.join(deployDir, "storage", "backups"));
const backupRequired = !isDisabled(env.SYSTEM_UPDATE_BACKUP_REQUIRED);

function log(message) {
  if (!jsonMode) console.log(message);
}

function result(status, data) {
  const payload = {
    status,
    command,
    deployDir,
    gitBranch,
    gitUrl,
    composeFile,
    timestamp: new Date().toISOString(),
    ...data,
  };
  if (jsonMode) {
    process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
  }
  return payload;
}

function fail(message, detail) {
  result("failed", { message, detail });
  process.exit(1);
}

function run(commandName, commandArgs, options = {}) {
  return new Promise((resolve) => {
    const executable = resolveExecutable(commandName);
    const child = spawn(executable, commandArgs, {
      cwd: options.cwd ?? deployDir,
      env: { ...process.env, ...env, ...options.env },
      shell: process.platform === "win32" && executable.endsWith(".cmd"),
      windowsHide: true,
    });
    let stdout = "";
    let stderr = "";

    child.stdout?.on("data", (chunk) => {
      const text = String(chunk);
      stdout += text;
      if (!jsonMode) process.stdout.write(text);
    });
    child.stderr?.on("data", (chunk) => {
      const text = String(chunk);
      stderr += text;
      if (!jsonMode) process.stderr.write(text);
    });
    child.once("error", (error) => {
      resolve({ code: 1, stderr: error.message, stdout });
    });
    child.once("exit", (code) => resolve({ code: Number(code ?? 0), stderr, stdout }));
  });
}

async function capture(commandName, commandArgs, options = {}) {
  const completed = await run(commandName, commandArgs, options);
  return completed.code === 0 ? completed.stdout.trim() : "";
}

async function requireCommand(commandName, versionArgs = ["--version"]) {
  if (commandName === "node") {
    return { available: true, detail: process.version, name: commandName };
  }

  if (process.platform === "win32" && commandName === "npm") {
    const completed = await run("where.exe", ["npm"], { cwd: scriptRoot });
    return {
      available: completed.code === 0,
      detail: (completed.stdout || completed.stderr).trim().split(/\r?\n/)[0] ?? "",
      name: commandName,
    };
  }

  const completed = await run(commandName, versionArgs, { cwd: scriptRoot });
  return {
    available: completed.code === 0,
    detail: (completed.stdout || completed.stderr).trim().split(/\r?\n/)[0] ?? "",
    name: commandName,
  };
}

async function hasCommand(commandName, versionArgs = ["--version"]) {
  const completed = await run(commandName, versionArgs, { cwd: scriptRoot });
  return completed.code === 0;
}

function resolveExecutable(commandName) {
  if (path.isAbsolute(commandName)) return commandName;
  if (process.platform === "win32" && ["pnpm"].includes(commandName)) {
    return `${commandName}.cmd`;
  }
  return commandName;
}

function isRunningInContainer() {
  return existsSync("/.dockerenv");
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function shellQuote(value) {
  return `'${String(value).replaceAll("'", "'\\''")}'`;
}

async function currentContainerDeploySource() {
  if (!isRunningInContainer()) return deployDir;
  const template = `{{range .Mounts}}{{if eq .Destination "${deployDir}"}}{{.Source}}{{end}}{{end}}`;
  return (await capture("docker", ["inspect", appContainerName, "--format", template])) || deployDir;
}

async function waitForContainerHealthy(containerName, attempts = 90, delayMs = 2000) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const status = await capture("docker", [
      "inspect",
      containerName,
      "--format",
      "{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}",
    ]);

    if (status === "healthy") {
      return;
    }

    await sleep(delayMs);
  }

  fail(`Application container ${containerName} did not become healthy in time after restart.`);
}

async function dockerCompose(args, options = {}) {
  const composeArgs = ["-f", composeFile, ...args];
  const direct = await run("docker", ["compose", ...composeArgs], options);
  if (direct.code === 0) return direct;
  const legacy = await run("docker-compose", composeArgs, options);
  return legacy;
}

async function checkDockerCompose() {
  const direct = await run("docker", ["compose", "version"], { cwd: scriptRoot });
  if (direct.code === 0) {
    return { available: true, detail: direct.stdout.trim().split(/\r?\n/)[0] ?? "", name: "docker compose" };
  }
  const legacy = await run("docker-compose", ["version"], { cwd: scriptRoot });
  return {
    available: legacy.code === 0,
    detail: (legacy.stdout || legacy.stderr).trim().split(/\r?\n/)[0] ?? "",
    name: "docker compose",
  };
}

async function remoteHead() {
  if (!gitUrl) return "";
  const completed = await run("git", ["ls-remote", "--heads", gitUrl, gitBranch], { cwd: scriptRoot });
  if (completed.code !== 0) return "";
  return completed.stdout.trim().split(/\s+/)[0] ?? "";
}

function packageVersion() {
  try {
    return JSON.parse(readFileSync(path.join(deployDir, "package.json"), "utf8")).version ?? "";
  } catch {
    return "";
  }
}

async function gitStatus() {
  const isRepo = existsSync(path.join(deployDir, ".git"));
  const localCommit = isRepo ? await capture("git", ["rev-parse", "HEAD"]) : "";
  const branch = isRepo ? await capture("git", ["branch", "--show-current"]) : "";
  return {
    branch,
    isRepo,
    localCommit,
    packageVersion: packageVersion(),
    remoteCommit: await remoteHead(),
  };
}

async function preflight() {
  const dumpAvailable = (await hasCommand("mysqldump")) || (await hasCommand("mariadb-dump"));
  const checks = [
    await requireCommand("node"),
    await requireCommand("pnpm"),
    await requireCommand("git"),
    await requireCommand("docker"),
    await checkDockerCompose(),
    {
      available: !backupRequired || dumpAvailable,
      detail: dumpAvailable ? "database dump command available" : "set SYSTEM_UPDATE_BACKUP_REQUIRED=false to bypass",
      name: "database backup",
    },
  ];
  const git = await gitStatus();
  const missing = checks.filter((check) => !check.available).map((check) => check.name);
  const problems = [
    ...missing.map((name) => `${name} is not available`),
    !gitUrl ? "GIT_URL is required" : "",
    !gitBranch ? "GIT_BRANCH is required" : "",
    !git.remoteCommit ? "latest remote version could not be read from GitHub" : "",
  ].filter(Boolean);

  return { checks, git, ok: problems.length === 0, problems };
}

async function backupDatabase() {
  if (!backupRequired) {
    return { skipped: true, reason: "SYSTEM_UPDATE_BACKUP_REQUIRED is disabled" };
  }

  const dumpCommand = (await hasCommand("mysqldump")) ? "mysqldump" : (await hasCommand("mariadb-dump")) ? "mariadb-dump" : "";
  if (!dumpCommand) {
    fail("Database backup is required before deploy, but mysqldump/mariadb-dump is not available.");
  }

  const dbName = env.DB_NAME;
  if (!dbName) fail("Database backup requires DB_NAME.");

  await import("node:fs").then(({ mkdirSync }) => mkdirSync(backupDir, { recursive: true }));
  const stamp = new Date().toISOString().replaceAll(":", "-").replace(/\.\d{3}Z$/, "Z");
  const backupPath = path.join(backupDir, `${dbName}-${stamp}.sql`);
  const backupArgs = [
    `--host=${env.DB_HOST || "127.0.0.1"}`,
    `--port=${env.DB_PORT || "3306"}`,
    `--user=${env.DB_USER || "root"}`,
    `--result-file=${backupPath}`,
  ];
  if (env.DB_PASSWORD) backupArgs.push(`--password=${env.DB_PASSWORD}`);
  backupArgs.push(dbName);

  log(`Backing up database ${dbName} to ${backupPath}`);
  const completed = await run(dumpCommand, backupArgs, { cwd: deployDir });
  if (completed.code !== 0) fail("Database backup failed. Deploy was stopped before code update.", completed.stderr);

  return { backupPath, dbName };
}

async function migrateDatabase() {
  log("Running database migrations");
  const completed = await run("pnpm", ["db:migrate"], { cwd: deployDir });
  if (completed.code !== 0) fail("Database migration failed. Deploy was stopped before restart.", completed.stderr || completed.stdout);
}

async function syncSource() {
  if (!existsSync(deployDir)) {
    log(`Cloning ${gitUrl} (${gitBranch}) into ${deployDir}`);
    const completed = await run("git", ["clone", "--branch", gitBranch, gitUrl, deployDir], {
      cwd: path.dirname(deployDir),
    });
    if (completed.code !== 0) fail("Git clone failed.", completed.stderr);
    return gitStatus();
  }

  if (!existsSync(path.join(deployDir, ".git"))) {
    fail(`Deploy directory exists but is not a git repository: ${deployDir}`);
  }

  log(`Pulling latest ${gitBranch} in ${deployDir}`);
  const fetch = await run("git", ["fetch", "origin", gitBranch], { cwd: deployDir });
  if (fetch.code !== 0) fail("Git fetch failed.", fetch.stderr);
  const pull = await run("git", ["pull", "--ff-only", "origin", gitBranch], { cwd: deployDir });
  if (pull.code !== 0) fail("Git pull failed. Resolve local changes or use a clean deploy directory.", pull.stderr);
  return gitStatus();
}

async function buildApp() {
  log("Building Docker app image");
  const completed = await dockerCompose(["build", "app"], { cwd: deployDir });
  if (completed.code !== 0) fail("Docker compose build failed.", completed.stderr);
}

async function restartApp() {
  log("Restarting Docker app service");
  if (isRunningInContainer()) {
    const deploySource = await currentContainerDeploySource();
    const helperName = `cxnext-update-helper-${Date.now()}`;
    const helperImage = `cxnext-app:${env.APP_VERSION || "local"}`;
    const smokeCommand = isEnabled(env.SMOKE_TEST_ENABLED)
      ? `; docker compose -f ${shellQuote(composeFile)} exec -T app pnpm smoke:test`
      : "";
    const waitCommand = `until [ "$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}' ${shellQuote(appContainerName)} 2>/dev/null)" = "healthy" ]; do sleep 2; done`;
    const restartCommand = `sleep 2; docker compose -f ${shellQuote(composeFile)} up -d app; ${waitCommand}${smokeCommand}`;
    const completed = await run(
      "docker",
      [
        "run",
        "-d",
        "--rm",
        "--name",
        helperName,
        "-v",
        "/var/run/docker.sock:/var/run/docker.sock",
        "--volumes-from",
        appContainerName,
        "-e",
        `DEPLOY_SOURCE=${deploySource}`,
        "-w",
        deployDir,
        helperImage,
        "sh",
        "-lc",
        restartCommand,
      ],
      { cwd: deployDir },
    );
    if (completed.code !== 0) fail("Docker compose restart helper failed.", completed.stderr || completed.stdout);
    return;
  }

  const completed = await dockerCompose(["up", "-d", "app"], { cwd: deployDir });
  if (completed.code !== 0) fail("Docker compose restart failed.", completed.stderr);
  await waitForContainerHealthy(appContainerName);
}

function isEnabled(value) {
  return ["1", "true", "yes", "on"].includes(String(value ?? "").trim().toLowerCase());
}

function isDisabled(value) {
  return ["0", "false", "no", "off"].includes(String(value ?? "").trim().toLowerCase());
}

async function smokeTest() {
  log("Running smoke test");
  const completed = await dockerCompose(["exec", "-T", "app", "pnpm", "smoke:test"], { cwd: deployDir });
  if (completed.code !== 0) fail("Smoke test failed.", completed.stderr || completed.stdout);
}

async function rollbackSource() {
  const targetCommit = env.ROLLBACK_COMMIT || env.SYSTEM_UPDATE_ROLLBACK_COMMIT;
  if (!targetCommit) fail("Rollback requires ROLLBACK_COMMIT.");
  if (!existsSync(path.join(deployDir, ".git"))) {
    fail(`Rollback requires a git repository: ${deployDir}`);
  }

  log(`Rolling back source to ${targetCommit}`);
  const fetch = await run("git", ["fetch", "origin", gitBranch], { cwd: deployDir });
  if (fetch.code !== 0) fail("Git fetch failed before rollback.", fetch.stderr);
  const checkout = await run("git", ["checkout", "--force", targetCommit], { cwd: deployDir });
  if (checkout.code !== 0) fail("Git rollback checkout failed.", checkout.stderr);
  return gitStatus();
}

switch (command) {
  case "preflight": {
    const data = await preflight();
    result(data.ok ? "ok" : "failed", data);
    process.exit(data.ok ? 0 : 1);
    break;
  }
  case "status":
    result("ok", { git: await gitStatus(), preflight: await preflight() });
    break;
  case "sync":
    result("ok", { git: await syncSource() });
    break;
  case "build":
    await buildApp();
    result("ok", { git: await gitStatus() });
    break;
  case "restart":
    await restartApp();
    if (isEnabled(env.SMOKE_TEST_ENABLED) && !isRunningInContainer()) await smokeTest();
    result("ok", { git: await gitStatus() });
    break;
  case "smoke":
    await smokeTest();
    result("ok", { git: await gitStatus() });
    break;
  case "rollback": {
    const data = await preflight();
    if (!data.ok) fail("Preflight failed.", data.problems);
    await rollbackSource();
    await buildApp();
    await restartApp();
    if (isEnabled(env.SMOKE_TEST_ENABLED) && !isRunningInContainer()) await smokeTest();
    result("ok", { git: await gitStatus() });
    break;
  }
  case "deploy": {
    const data = await preflight();
    if (!data.ok) fail("Preflight failed.", data.problems);
    const previousCommit = data.git.localCommit;
    const backup = await backupDatabase();
    await syncSource();
    await migrateDatabase();
    await buildApp();
    await restartApp();
    if (isEnabled(env.SMOKE_TEST_ENABLED) && !isRunningInContainer()) await smokeTest();
    result("ok", { backup, git: await gitStatus(), previousCommit });
    break;
  }
  default:
    fail(`Unknown system update command: ${command}`);
}
