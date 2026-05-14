import { spawn } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseEnv } from "node:util";

const scriptRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const root = path.resolve(process.env.DEPLOY_DIR || scriptRoot);
const args = process.argv.slice(2);
const jsonMode = args.includes("--json");
const command = args.find((arg) => !arg.startsWith("--")) ?? "status";
let suppressStepOutput = false;
const envPath = path.join(root, ".env");
const sampleEnvPath = path.join(root, ".env.sample");
const requiredKeys = [
  "APP_ENV",
  "APP_HOST",
  "APP_HTTP_PORT",
  "FRONTEND_HTTP_PORT",
  "DB_HOST",
  "DB_PORT",
  "DB_NAME",
  "DB_USER",
  "DB_PASSWORD",
  "JWT_SECRET",
  "GIT_URL",
  "GIT_BRANCH",
  "DEPLOY_DIR",
  "COMPOSE_FILE",
];

const defaults = {
  APP_ENV: "production",
  APP_HOST: "0.0.0.0",
  APP_HTTP_PORT: "4000",
  FRONTEND_HTTP_PORT: "3000",
  APP_PUBLIC_PORT: "4000",
  FRONTEND_PUBLIC_PORT: "3000",
  DB_DRIVER: "mariadb",
  DB_HOST: "mariadb",
  DB_PORT: "3306",
  DB_NAME: "cxnext_db",
  DB_USER: "root",
  DB_PASSWORD: "DbPass1@@",
  DB_SSL: "false",
  JWT_SECRET: "replace-with-a-long-random-production-secret",
  GIT_URL: "https://github.com/sundar-aaran/cxnext.git",
  GIT_BRANCH: "main",
  DEPLOY_DIR: root,
  COMPOSE_FILE: ".container/docker-compose.yml",
  APP_CONTAINER_NAME: "cxnext-app",
  SYSTEM_UPDATE_ENABLED: "true",
  SMOKE_TEST_ENABLED: "false",
  SMOKE_TEST_TIMEOUT_MS: "60000",
};

function output(status, data = {}) {
  const payload = {
    command,
    envPath,
    status,
    timestamp: new Date().toISOString(),
    ...data,
  };

  if (suppressStepOutput) {
    return payload;
  }

  if (jsonMode) {
    process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
  } else {
    process.stdout.write(`${payload.status}: ${payload.message ?? command}\n`);
  }

  return payload;
}

function fail(message, detail) {
  suppressStepOutput = false;
  output("failed", { detail, message });
  process.exit(1);
}

function readEnvFile(filePath) {
  if (!existsSync(filePath)) return new Map();
  return new Map(Object.entries(parseEnv(readFileSync(filePath, "utf8"))).filter((entry) => entry[1] !== undefined));
}

function readCurrentEnv() {
  return new Map([...Object.entries(defaults), ...readEnvFile(envPath), ...Object.entries(process.env)]);
}

function setupStatus() {
  const values = readCurrentEnv();
  const fileValues = readEnvFile(envPath);
  const missing = requiredKeys.filter((key) => !String(values.get(key) ?? "").trim());
  const placeholderSecrets = ["JWT_SECRET"].filter((key) =>
    String(values.get(key) ?? "").includes("replace-with"),
  );

  return {
    configured: existsSync(envPath) && missing.length === 0 && placeholderSecrets.length === 0,
    envExists: existsSync(envPath),
    missing,
    placeholderSecrets,
    values: Object.fromEntries(
      requiredKeys.map((key) => [key, key.includes("PASSWORD") || key.includes("SECRET") ? mask(values.get(key)) : values.get(key) ?? ""]),
    ),
    writtenKeys: [...fileValues.keys()],
  };
}

function mask(value) {
  const text = String(value ?? "");
  if (!text) return "";
  if (text.length <= 4) return "****";
  return `${text.slice(0, 2)}****${text.slice(-2)}`;
}

function parseSetArgs() {
  const values = new Map();
  for (const arg of args) {
    if (!arg.startsWith("--set=")) continue;
    const pair = arg.slice("--set=".length);
    const index = pair.indexOf("=");
    if (index <= 0) continue;
    values.set(pair.slice(0, index), pair.slice(index + 1));
  }
  return values;
}

function quoteEnvValue(value) {
  const text = String(value ?? "");
  return /[\s"#']/.test(text) ? JSON.stringify(text) : text;
}

function writeEnvValues(nextValues) {
  const baseText = existsSync(envPath)
    ? readFileSync(envPath, "utf8")
    : existsSync(sampleEnvPath)
      ? readFileSync(sampleEnvPath, "utf8")
      : "";
  const written = new Set();
  const lines = baseText.split(/\r?\n/).map((line) => {
    const match = line.match(/^(\s*)([A-Z0-9_]+)(\s*=\s*)(.*)$/);
    const key = match?.[2];
    if (!key || !nextValues.has(key)) return line;
    written.add(key);
    return `${match?.[1] ?? ""}${key}${match?.[3] ?? "="}${quoteEnvValue(nextValues.get(key))}`;
  });
  const missing = [...nextValues.entries()].filter(([key]) => !written.has(key));
  if (missing.length > 0) {
    if (lines.length > 0 && lines.at(-1)?.trim()) lines.push("");
    lines.push("# Added from cxnext setup");
    for (const [key, value] of missing) {
      lines.push(`${key}=${quoteEnvValue(value)}`);
    }
  }
  writeFileSync(envPath, `${lines.join("\n").replace(/\n*$/, "")}\n`, "utf8");
}

function configure() {
  const input = parseSetArgs();
  const values = new Map([...Object.entries(defaults), ...readEnvFile(envPath), ...input]);
  writeEnvValues(values);
  return output("ok", {
    message: ".env configured.",
    setup: setupStatus(),
  });
}

function run(commandName, commandArgs, options = {}) {
  return new Promise((resolve) => {
    const child = spawn(commandName, commandArgs, {
      cwd: options.cwd ?? root,
      env: { ...process.env, ...Object.fromEntries(readEnvFile(envPath)) },
      shell: process.platform === "win32",
      windowsHide: true,
    });
    let stdout = "";
    let stderr = "";
    child.stdout?.on("data", (chunk) => {
      stdout += String(chunk);
      if (!jsonMode) process.stdout.write(String(chunk));
    });
    child.stderr?.on("data", (chunk) => {
      stderr += String(chunk);
      if (!jsonMode) process.stderr.write(String(chunk));
    });
    child.once("error", (error) => resolve({ code: 1, stderr: error.message, stdout }));
    child.once("exit", (code) => resolve({ code: Number(code ?? 0), stderr, stdout }));
  });
}

async function runStep(name, commandName, commandArgs) {
  const completed = await run(commandName, commandArgs);
  if (completed.code !== 0) fail(`${name} failed.`, completed.stderr || completed.stdout);
  return completed;
}

async function capture(commandName, commandArgs, options = {}) {
  const completed = await run(commandName, commandArgs, options);
  return completed.code === 0 ? completed.stdout.trim() : "";
}

async function runComposeStep(name, composeArgs) {
  const composeFile = String(readCurrentEnv().get("COMPOSE_FILE") || ".container/docker-compose.yml");
  const direct = await run("docker", ["compose", "-f", composeFile, ...composeArgs]);
  if (direct.code === 0) return direct;

  const legacy = await run("docker-compose", ["-f", composeFile, ...composeArgs]);
  if (legacy.code !== 0) {
    fail(`${name} failed.`, legacy.stderr || legacy.stdout || direct.stderr || direct.stdout);
  }
  return legacy;
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
  if (!isRunningInContainer()) return root;
  const template = `{{range .Mounts}}{{if eq .Destination "${root}"}}{{.Source}}{{end}}{{end}}`;
  const appContainerName = String(readCurrentEnv().get("APP_CONTAINER_NAME") || "cxnext-app");
  return (await capture("docker", ["inspect", appContainerName, "--format", template])) || root;
}

async function waitForContainerHealthy(containerName, attempts = 60, delayMs = 2000) {
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

  fail(`Application container ${containerName} did not become healthy in time.`);
}

async function runDetachedComposeStart() {
  const env = readCurrentEnv();
  const deploySource = await currentContainerDeploySource();
  const helperName = `cxnext-setup-helper-${Date.now()}`;
  const helperImage = `cxnext-app:${String(env.get("APP_VERSION") || "local")}`;
  const composePath = String(env.get("COMPOSE_FILE") || ".container/docker-compose.yml");
  const appContainerName = String(env.get("APP_CONTAINER_NAME") || "cxnext-app");
  const smokeCommand = isEnabled(env.get("SMOKE_TEST_ENABLED"))
    ? `; docker compose -f ${shellQuote(composePath)} exec -T app pnpm smoke:test`
    : "";
  const waitCommand = `until [ "$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}' ${shellQuote(appContainerName)} 2>/dev/null)" = "healthy" ]; do sleep 2; done`;
  const startCommand = `sleep 2; docker compose -f ${shellQuote(composePath)} up -d app; ${waitCommand}${smokeCommand}`;
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
      root,
      helperImage,
      "sh",
      "-lc",
      startCommand,
    ],
    { cwd: root },
  );
  if (completed.code !== 0) fail("Docker start helper failed.", completed.stderr || completed.stdout);
}

async function pullLatest() {
  const env = readCurrentEnv();
  const gitUrl = String(env.get("GIT_URL") ?? defaults.GIT_URL);
  const branch = String(env.get("GIT_BRANCH") ?? defaults.GIT_BRANCH);
  const deployDir = path.resolve(String(env.get("DEPLOY_DIR") ?? root));

  if (!existsSync(path.join(deployDir, ".git"))) {
    fail(`Deploy directory is not a git checkout: ${deployDir}`);
  }

  await runStep("Git fetch", "git", ["fetch", "origin", branch]);
  await runStep("Git pull", "git", ["pull", "--ff-only", gitUrl, branch]);
  return output("ok", { message: "Latest cxnext version downloaded.", deployDir, gitBranch: branch, gitUrl });
}

async function buildApp() {
  await runComposeStep("Docker build", ["build", "app"]);
  return output("ok", { message: "Application image built." });
}

async function startApp() {
  if (isRunningInContainer()) {
    await runDetachedComposeStart();
    return output("ok", { message: "Application container restart scheduled." });
  }

  await runComposeStep("Docker start", ["up", "-d", "app"]);
  await waitForContainerHealthy(String(readCurrentEnv().get("APP_CONTAINER_NAME") || "cxnext-app"));
  return output("ok", { message: "Application container started." });
}

async function prepareDatabase() {
  await runComposeStep("Database prepare", ["exec", "-T", "app", "pnpm", "db:prepare"]);
  return output("ok", { message: "Database prepared." });
}

function isEnabled(value) {
  return ["1", "true", "yes", "on"].includes(String(value ?? "").trim().toLowerCase());
}

async function smokeTest() {
  await runComposeStep("Smoke test", ["exec", "-T", "app", "pnpm", "smoke:test"]);
  return output("ok", { message: "Smoke test passed." });
}

switch (command) {
  case "status":
    output("ok", { setup: setupStatus() });
    break;
  case "configure":
    configure();
    break;
  case "pull":
    await pullLatest();
    break;
  case "build":
    await buildApp();
    break;
  case "start":
    await startApp();
    if (isEnabled(readCurrentEnv().get("SMOKE_TEST_ENABLED")) && !isRunningInContainer()) {
      await smokeTest();
    }
    break;
  case "prepare-db":
    await prepareDatabase();
    break;
  case "smoke":
    await smokeTest();
    break;
  case "deploy":
    suppressStepOutput = true;
    await pullLatest();
    await buildApp();
    await startApp();
    if (isEnabled(readCurrentEnv().get("SMOKE_TEST_ENABLED")) && !isRunningInContainer()) {
      await smokeTest();
    }
    suppressStepOutput = false;
    output("ok", { message: "Application deployed." });
    break;
  default:
    fail(`Unknown setup command: ${command}`);
}
