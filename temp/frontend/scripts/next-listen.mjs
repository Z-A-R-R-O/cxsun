import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { clearTimeout, setTimeout } from "node:timers";
import { parseEnv } from "node:util";
import { resolveRuntimeEnv } from "../../../scripts/runtime-env.mjs";
import { ensureStorageLinks } from "../../../scripts/storage-link.mjs";

loadEnvFromRoot();
ensureStorageLinks();
const runtimeEnv = resolveRuntimeEnv();
Object.assign(process.env, runtimeEnv);

const args = process.argv.slice(2);
const mode = args[0] ?? "dev";
const nextArgs = [mode, ...args.slice(1)];
const nodeEnv = mode === "start" || mode === "build" ? "production" : "development";
const require = createRequire(import.meta.url);
const nextBin = require.resolve("next/dist/bin/next");
const port =
  mode === "build"
    ? null
    : (readOptionValue(nextArgs, "--port") ?? requireEnv("FRONTEND_HTTP_PORT"));
const host =
  mode === "build"
    ? null
    : (readOptionValue(nextArgs, "--hostname") ?? requireEnv("APP_HOST"));
const frontendUrl = port && host ? `http://${printableHost(host)}:${port}` : null;

function printFrontendUrl() {
  if (frontendUrl) {
    process.stdout.write(`cxnext frontend listening on ${frontendUrl}\n`);
  }
}

printFrontendUrl();

const child = spawn(process.execPath, [nextBin, ...nextArgs], {
  stdio: "inherit",
  windowsHide: true,
  env: {
    ...process.env,
    NODE_ENV: nodeEnv,
  },
});

const repeatUrlTimer = frontendUrl ? setTimeout(printFrontendUrl, 1500) : null;
repeatUrlTimer?.unref?.();

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.once(signal, () => {
    if (!child.killed) {
      child.kill(signal);
    }
  });
}

child.once("exit", (code) => {
  if (repeatUrlTimer) {
    clearTimeout(repeatUrlTimer);
  }
  process.exit(Number(code ?? 0));
});

function requireEnv(key) {
  const value = process.env[key];

  if (!value) {
    throw new Error(`${key} is required.`);
  }

  return value;
}

function loadEnvFromRoot() {
  let currentDirectory = path.resolve(import.meta.dirname, "..", "..", "..");

  while (true) {
    const envPath = path.join(currentDirectory, ".env");

    if (existsSync(envPath)) {
      const parsedEnv = parseEnv(readFileSync(envPath, "utf8"));

      for (const [key, value] of Object.entries(parsedEnv)) {
        if (value !== undefined && process.env[key] === undefined) {
          process.env[key] = value;
        }
      }

      return;
    }

    const parentDirectory = path.dirname(currentDirectory);

    if (parentDirectory === currentDirectory) {
      return;
    }

    currentDirectory = parentDirectory;
  }
}

function readOptionValue(values, name) {
  const equalsArg = values.find((value) => value.startsWith(`${name}=`));
  if (equalsArg) {
    return equalsArg.slice(name.length + 1);
  }

  const index = values.indexOf(name);
  if (index === -1) {
    return undefined;
  }

  return values[index + 1];
}

function printableHost(host) {
  return host === "0.0.0.0" || host === "::" ? "localhost" : host;
}
