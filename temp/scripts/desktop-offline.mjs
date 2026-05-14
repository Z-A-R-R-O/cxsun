import { spawn } from "node:child_process";
import { createInterface } from "node:readline/promises";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { parseArgs, parseEnv } from "node:util";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const { positionals, values } = parseArgs({
  allowPositionals: true,
  options: {
    client: { type: "string", short: "c" },
    configure: { type: "boolean" },
    "env-file": { type: "string" },
    "skip-build": { type: "boolean" },
    "keep-db-host": { type: "boolean" },
  },
});

const clientName = values.client ?? positionals[0] ?? process.env.DESKTOP_CLIENT ?? "codexsun";
const clientEnvPath = path.join(rootDir, ".container", "client", clientName, "client.env");
const desktopEnvPath = path.resolve(
  rootDir,
  values["env-file"] ?? process.env.DESKTOP_ENV_FILE ?? ".env.desktop.local",
);

if (!existsSync(clientEnvPath)) {
  throw new Error(`Unknown desktop client '${clientName}'. Missing ${clientEnvPath}`);
}

const clientEnv = parseEnv(readFileSync(clientEnvPath, "utf8"));
const rootEnvPath = path.join(rootDir, ".env");
const rootEnv = existsSync(rootEnvPath) ? parseEnv(readFileSync(rootEnvPath, "utf8")) : {};
const desktopLocalEnv = await resolveDesktopLocalEnv({
  clientEnv,
  desktopEnvPath,
  rootEnv,
});
const desktopEnv = {
  ...process.env,
  ...clientEnv,
  ...desktopLocalEnv,
  APP_ENV: "production",
  NODE_ENV: "production",
  APP_HOST: "127.0.0.1",
  APP_HTTP_PORT: process.env.DESKTOP_APP_PORT ?? "4000",
  FRONTEND_HTTP_PORT: process.env.DESKTOP_FRONTEND_PORT ?? "3000",
  FRONTEND_URL: `http://127.0.0.1:${process.env.DESKTOP_FRONTEND_PORT ?? "3000"}`,
  BACKEND_URL: `http://127.0.0.1:${process.env.DESKTOP_APP_PORT ?? "4000"}`,
  BACKEND_HEALTH_URL: `http://127.0.0.1:${process.env.DESKTOP_APP_PORT ?? "4000"}/health`,
  NEXT_PUBLIC_API_URL: `http://127.0.0.1:${process.env.DESKTOP_APP_PORT ?? "4000"}/api/v1`,
  CORS_ORIGINS: [
    `http://127.0.0.1:${process.env.DESKTOP_FRONTEND_PORT ?? "3000"}`,
    `http://localhost:${process.env.DESKTOP_FRONTEND_PORT ?? "3000"}`,
  ].join(","),
  ...(existsSync(desktopEnvPath) ? { DB_ENV_FILE: desktopEnvPath } : {}),
  DESKTOP_CLIENT: clientName,
  DESKTOP_START_SERVICES: "true",
  DESKTOP_PREPARE_DB: process.env.DESKTOP_PREPARE_DB ?? "true",
  DESKTOP_READY_TIMEOUT_MS: process.env.DESKTOP_READY_TIMEOUT_MS ?? "90000",
  NEXT_TELEMETRY_DISABLED: "1",
};

if (!values["keep-db-host"] && desktopEnv.DB_HOST === "mariadb") {
  desktopEnv.DB_HOST = "127.0.0.1";
}

const commandName = (command) => (process.platform === "win32" ? `${command}.cmd` : command);

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const childCommand = process.platform === "win32" ? (process.env.ComSpec ?? "cmd.exe") : commandName(command);
    const childArgs =
      process.platform === "win32" ? ["/d", "/c", commandName(command), ...args] : args;
    const child = spawn(childCommand, childArgs, {
      cwd: rootDir,
      env: desktopEnv,
      stdio: "inherit",
      ...options,
    });

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`${command} ${args.join(" ")} failed with exit code ${code}`));
    });
  });
}

async function main() {
  if (!values["skip-build"]) {
    await run("corepack", ["pnpm", "--filter", "@cxnext/db", "build"]);
    await run("corepack", ["pnpm", "--filter", "@cxnext/server", "build"]);
    await run("corepack", ["pnpm", "--filter", "@cxnext/frontend", "build"]);
    await run("corepack", ["pnpm", "--filter", "@cxnext/desktop", "build"]);
  }

  console.log(`[desktop-offline] Starting ${clientName} desktop app`);
  console.log(`[desktop-offline] Frontend: ${desktopEnv.FRONTEND_URL}`);
  console.log(`[desktop-offline] Backend: ${desktopEnv.BACKEND_URL}`);
  console.log(`[desktop-offline] Database: ${desktopEnv.DB_HOST}:${desktopEnv.DB_PORT}/${desktopEnv.DB_NAME}`);
  console.log(`[desktop-offline] Desktop env: ${existsSync(desktopEnvPath) ? desktopEnvPath : "not configured"}`);

  await run("corepack", ["pnpm", "--filter", "@cxnext/desktop", "exec", "electron", "dist/main.js"]);
}

main().catch((error) => {
  console.error(`[desktop-offline] ${error.message}`);
  process.exitCode = 1;
});

async function resolveDesktopLocalEnv(options) {
  if (values.configure || !existsSync(options.desktopEnvPath)) {
    if (process.stdin.isTTY) {
      return configureDesktopEnv(options);
    }

    if (!existsSync(options.desktopEnvPath)) {
      console.warn(
        `[desktop-offline] ${options.desktopEnvPath} not found. Falling back to client/root DB env.`,
      );
      return {};
    }
  }

  return parseEnv(readFileSync(options.desktopEnvPath, "utf8"));
}

async function configureDesktopEnv(options) {
  const defaults = {
    DB_HOST: desktopDefault(options, "DB_HOST", "127.0.0.1"),
    DB_PORT: desktopDefault(options, "DB_PORT", "3306"),
    DB_NAME: desktopDefault(options, "DB_NAME", `${clientName}_db`),
    DB_USER: desktopDefault(options, "DB_USER", "root"),
    DB_PASSWORD: desktopDefault(options, "DB_PASSWORD", ""),
  };
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  try {
    console.log(`[desktop-offline] Configure local desktop database: ${options.desktopEnvPath}`);
    const values = {
      DB_HOST: await ask(rl, "DB host", defaults.DB_HOST),
      DB_PORT: await ask(rl, "DB port", defaults.DB_PORT),
      DB_NAME: await ask(rl, "DB name", defaults.DB_NAME),
      DB_USER: await ask(rl, "DB user", defaults.DB_USER),
      DB_PASSWORD: await ask(rl, "DB password", defaults.DB_PASSWORD),
    };
    const lines = [
      "# Local desktop database credentials. Keep cloud/docker credentials in .env or .container/client/*/client.env.",
      `DESKTOP_CLIENT=${clientName}`,
      ...Object.entries(values).map(([key, value]) => `${key}=${escapeEnvValue(value)}`),
      "",
    ];

    writeFileSync(options.desktopEnvPath, lines.join("\n"), "utf8");
    console.log(`[desktop-offline] Saved ${options.desktopEnvPath}`);
    return values;
  } finally {
    rl.close();
  }
}

function desktopDefault(options, key, fallback) {
  return String(process.env[key] ?? options.rootEnv[key] ?? options.clientEnv[key] ?? fallback);
}

async function ask(rl, label, fallback) {
  const answer = await rl.question(`${label} [${fallback}]: `);
  return answer.trim() || fallback;
}

function escapeEnvValue(value) {
  if (/^[A-Za-z0-9_./:@-]*$/.test(value)) {
    return value;
  }
  return JSON.stringify(value);
}
