import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadRootEnv, resolveRuntimeEnv } from "./runtime-env.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const requireFromDbPackage = createRequire(path.join(root, "packages", "db", "package.json"));
const { createConnection } = requireFromDbPackage("mysql2/promise");
const args = process.argv.slice(2);
const jsonMode = args.includes("--json");

loadRootEnv(root);

const env = resolveRuntimeEnv();
const timeoutMs = Number(env.SMOKE_TEST_TIMEOUT_MS || 60_000);
const intervalMs = 2_000;
const deadline = Date.now() + timeoutMs;

function isRunningInContainer() {
  return existsSync("/.dockerenv");
}

function internalFrontendUrl() {
  return `http://127.0.0.1:${env.FRONTEND_HTTP_PORT || 3000}`;
}

function internalBackendHealthUrl() {
  return `http://127.0.0.1:${env.APP_HTTP_PORT || env.PORT || 4000}/health`;
}

const smokeTargets = {
  frontend:
    env.SMOKE_TEST_FRONTEND_URL || (isRunningInContainer() ? internalFrontendUrl() : env.FRONTEND_URL),
  backend:
    env.SMOKE_TEST_BACKEND_HEALTH_URL ||
    (isRunningInContainer() ? internalBackendHealthUrl() : env.BACKEND_HEALTH_URL),
};

function log(message) {
  if (!jsonMode) process.stdout.write(`${message}\n`);
}

function result(name, status, detail) {
  return {
    name,
    status,
    detail,
    timestamp: new Date().toISOString(),
  };
}

async function retry(name, check) {
  let lastError = "";

  while (Date.now() <= deadline) {
    try {
      const detail = await check();
      return result(name, "ok", detail);
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
  }

  return result(name, "failed", lastError || `${name} smoke check timed out.`);
}

async function fetchOk(url, expectedContent) {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(Math.min(10_000, timeoutMs)),
  });
  const body = await response.text();

  if (!response.ok) {
    throw new Error(`${url} returned HTTP ${response.status}.`);
  }

  if (expectedContent && !expectedContent(response, body)) {
    throw new Error(`${url} returned an unexpected response.`);
  }

  return `${url} returned HTTP ${response.status}.`;
}

async function checkFrontend() {
  return fetchOk(smokeTargets.frontend, (response, body) => {
    const contentType = response.headers.get("content-type") ?? "";
    return contentType.includes("text/html") || body.includes("<html");
  });
}

async function checkBackend() {
  return fetchOk(smokeTargets.backend, (_response, body) => {
    try {
      const parsed = JSON.parse(body);
      return parsed.status === "ok" && parsed.service === "cxnext-server";
    } catch {
      return false;
    }
  });
}

async function checkDatabase() {
  const connection = await createConnection({
    host: env.DB_HOST,
    port: Number(env.DB_PORT || 3306),
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    database: env.DB_NAME,
  });

  try {
    const [rows] = await connection.query("SELECT 1 AS ok");
    const ok = Array.isArray(rows) && rows.some((row) => row?.ok === 1);

    if (!ok) {
      throw new Error("Database SELECT 1 did not return ok=1.");
    }

    return `${env.DB_HOST}:${env.DB_PORT}/${env.DB_NAME} accepted SELECT 1.`;
  } finally {
    await connection.end();
  }
}

const checks = [
  await retry("frontend", checkFrontend),
  await retry("backend", checkBackend),
  await retry("database", checkDatabase),
];
const ok = checks.every((check) => check.status === "ok");
const payload = {
  status: ok ? "ok" : "failed",
  checks,
  targets: smokeTargets,
  timeoutMs,
  timestamp: new Date().toISOString(),
};

if (jsonMode) {
  process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
} else {
  for (const check of checks) {
    log(`${check.status === "ok" ? "OK" : "FAIL"} ${check.name}: ${check.detail}`);
  }
  log(`Smoke test ${payload.status}.`);
}

process.exitCode = ok ? 0 : 1;
