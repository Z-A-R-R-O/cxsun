import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { loadRootEnv, resolveRuntimeEnv } from "./runtime-env.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const includeDesktop = process.argv.includes("--desktop");
const envFileExists =
  existsSync(path.join(root, ".env")) ||
  (process.env.DEPLOY_DIR ? existsSync(path.join(process.env.DEPLOY_DIR, ".env")) : false);
const setupMode = process.env.SETUP_MODE === "true" || !envFileExists;

loadRootEnv(root);

const runtimeEnv = resolveRuntimeEnv();
const backendHealthUrl = `http://127.0.0.1:${runtimeEnv.PORT}/health`;
const frontendHealthUrl = `http://127.0.0.1:${runtimeEnv.FRONTEND_HTTP_PORT ?? "3000"}`;
const readinessTimeoutMs = Number(runtimeEnv.START_READY_TIMEOUT_MS ?? 120000);

function pnpmInvocation(args) {
  const npmExecPath = process.env.npm_execpath;

  if (npmExecPath?.toLowerCase().includes("pnpm")) {
    return {
      command: process.execPath,
      args: [npmExecPath, ...args],
      shell: false,
    };
  }

  return {
    command: process.platform === "win32" ? "pnpm.cmd" : "pnpm",
    args,
    shell: process.platform === "win32",
  };
}

function spawnPnpm(args, name) {
  const pnpm = pnpmInvocation(args);
  const child = spawn(pnpm.command, pnpm.args, {
    cwd: root,
    stdio: "inherit",
    shell: pnpm.shell,
    windowsHide: true,
    env: {
      ...runtimeEnv,
      FRONTEND_URL: runtimeEnv.FRONTEND_URL,
      BACKEND_URL: runtimeEnv.BACKEND_URL,
      BACKEND_HEALTH_URL: runtimeEnv.BACKEND_HEALTH_URL,
      PORT: runtimeEnv.PORT,
    },
  });

  child.once("exit", (code) => {
    if (code && code !== 0) {
      console.error(`${name} exited with code ${code}`);
    }
  });

  return child;
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function checkUrl(url) {
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(5000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

async function waitForUrl(url, label, child, timeoutMs = readinessTimeoutMs) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    if (child.exitCode !== null) {
      throw new Error(`${label} process exited before readiness with code ${child.exitCode}.`);
    }

    if (await checkUrl(url)) {
      return;
    }

    await sleep(1000);
  }

  throw new Error(`${label} was not ready within ${timeoutMs}ms at ${url}.`);
}

async function releasePorts() {
  const stopScript = path.join(root, "scripts", "dev-stop.mjs");
  const child = spawn(process.execPath, [stopScript], {
    cwd: root,
    stdio: "inherit",
    windowsHide: true,
  });

  const code = await new Promise((resolve) => {
    child.once("exit", resolve);
  });

  if (code !== 0) {
    process.exit(Number(code ?? 1));
  }
}

async function runPreflight() {
  const preflightScript = path.join(root, "scripts", "preflight.mjs");
  const child = spawn(process.execPath, [preflightScript], {
    cwd: root,
    stdio: "inherit",
    windowsHide: true,
  });

  const code = await new Promise((resolve) => {
    child.once("exit", resolve);
  });

  if (code !== 0) {
    process.exit(Number(code ?? 1));
  }
}

function stopChildren(children) {
  for (const child of children) {
    if (!child.killed) {
      child.kill("SIGTERM");
    }
  }
}

function isEnabled(value) {
  return ["1", "true", "yes", "on"].includes(String(value ?? "").trim().toLowerCase());
}

async function runStartupSmoke(children) {
  if (!isEnabled(runtimeEnv.SMOKE_TEST_ENABLED)) {
    return;
  }

  process.stdout.write("cxnext startup smoke test enabled.\n");
  const smokeScript = path.join(root, "scripts", "smoke-test.mjs");
  const child = spawn(process.execPath, [smokeScript], {
    cwd: root,
    stdio: "inherit",
    windowsHide: true,
    env: runtimeEnv,
  });

  const code = await new Promise((resolve) => {
    child.once("exit", resolve);
  });

  if (code !== 0) {
    stopChildren(children);
    process.exit(Number(code ?? 1));
  }
}

if (!setupMode) {
  await runPreflight();
} else {
  process.stdout.write("cxnext setup mode: .env is missing, skipping database preflight.\n");
}
await releasePorts();

const children = [];
const server = spawnPnpm(["--filter", "@cxnext/server", "start"], "server");
children.push(server);
await waitForUrl(backendHealthUrl, "server health", server);

const frontend = spawnPnpm(["--filter", "@cxnext/frontend", "start"], "frontend");
children.push(frontend);
await waitForUrl(frontendHealthUrl, "frontend", frontend);

if (includeDesktop) {
  children.push(spawnPnpm(["--filter", "@cxnext/desktop", "start"], "desktop"));
}

process.stdout.write(
  [
    "",
    "cxnext production services are ready.",
    `frontend: ${runtimeEnv.FRONTEND_URL}`,
    `server: ${runtimeEnv.BACKEND_URL}`,
    `health: ${runtimeEnv.BACKEND_HEALTH_URL}`,
    "",
  ].join("\n"),
);

process.once("SIGINT", () => stopChildren(children));
process.once("SIGTERM", () => stopChildren(children));

await runStartupSmoke(children);
