import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { loadRootEnv, resolveRuntimeEnv } from "./runtime-env.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const pnpmCommand = process.platform === "win32" ? "pnpm.cmd" : "pnpm";

loadRootEnv(root);

const runtimeEnv = resolveRuntimeEnv();
const frontendUrl = runtimeEnv.FRONTEND_URL;
const backendUrl = runtimeEnv.BACKEND_URL;
const backendHealthUrl = runtimeEnv.BACKEND_HEALTH_URL;
const readinessTimeoutMs = Number(runtimeEnv.DEV_READY_TIMEOUT_MS ?? 120000);
const includeDesktop = process.argv.includes("--desktop") || process.argv.includes("--all");
const devServiceFilters = [
  "@cxnext/frontend",
  "@cxnext/server",
  ...(includeDesktop ? ["@cxnext/desktop"] : []),
];

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function checkUrl(url) {
  try {
    const response = await fetch(url);
    return response.ok;
  } catch {
    return false;
  }
}

async function waitForReadiness(child) {
  const startedAt = Date.now();
  let frontendReady = false;
  let backendReady = false;

  process.stdout.write("Waiting for cxnext services to become ready...\n");

  while (Date.now() - startedAt < readinessTimeoutMs) {
    if (child.exitCode !== null) {
      process.stdout.write(
        `cxnext dev server exited before readiness with code ${child.exitCode}.\n`,
      );
      return;
    }

    if (!backendReady) {
      backendReady = await checkUrl(backendHealthUrl);
    }

    if (!frontendReady) {
      frontendReady = await checkUrl(frontendUrl);
    }

    if (frontendReady && backendReady) {
      process.stdout.write(
        [
          "",
          "cxnext dev is ready.",
          `frontend: ${frontendUrl}`,
          `server: ${backendUrl}`,
          `health: ${backendHealthUrl}`,
          "",
        ].join("\n"),
      );
      return;
    }

    await sleep(1000);
  }

  const pending = [
    frontendReady ? null : `frontend ${frontendUrl}`,
    backendReady ? null : `server health ${backendHealthUrl}`,
  ].filter(Boolean);

  process.stdout.write(
    `cxnext dev started, but readiness timed out after ${readinessTimeoutMs}ms waiting for ${pending.join(", ")}.\n`,
  );
}

function resolvePnpmInvocation() {
  const npmExecPath = process.env.npm_execpath;
  const args = ["exec", "turbo", "dev", ...devServiceFilters.map((name) => `--filter=${name}`)];

  if (npmExecPath?.toLowerCase().includes("pnpm")) {
    return {
      command: process.execPath,
      args: [npmExecPath, ...args],
      shell: false,
    };
  }

  return {
    command: pnpmCommand,
    args,
    shell: process.platform === "win32",
  };
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

function runTurbo() {
  const pnpm = resolvePnpmInvocation();

  process.stdout.write(
    [
      "",
      `cxnext frontend listening on ${frontendUrl}`,
      `cxnext server listening on ${backendUrl}`,
      `cxnext server health on ${backendHealthUrl}`,
      includeDesktop ? "cxnext desktop app will start after services are ready" : "",
      "",
    ].filter(Boolean).join("\n"),
  );

  const child = spawn(pnpm.command, pnpm.args, {
    cwd: root,
    stdio: "inherit",
    shell: pnpm.shell,
    windowsHide: true,
    env: {
      ...runtimeEnv,
      FRONTEND_URL: frontendUrl,
      BACKEND_URL: backendUrl,
      BACKEND_HEALTH_URL: backendHealthUrl,
      PORT: runtimeEnv.PORT,
    },
  });

  const stop = (signal) => {
    if (!child.killed) {
      child.kill(signal);
    }
  };

  process.once("SIGINT", () => stop("SIGINT"));
  process.once("SIGTERM", () => stop("SIGTERM"));

  child.once("exit", (code) => {
    process.exit(Number(code ?? 0));
  });

  void waitForReadiness(child);
}

await Promise.all([runPreflight(), releasePorts()]);
runTurbo();
