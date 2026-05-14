import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseEnv } from "node:util";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const envRoot = process.env.DEPLOY_DIR ? path.resolve(process.env.DEPLOY_DIR) : root;
const envPath = path.join(envRoot, ".env");
const requiredDatabaseKeys = [
  "DB_HOST",
  "DB_PORT",
  "DB_USER",
  "DB_PASSWORD",
  "DB_NAME",
];
const requiredAuthKeys = ["JWT_SECRET"];

function fail(message) {
  console.error(`Preflight failed: ${message}`);
  process.exit(1);
}

function loadEnv() {
  if (!existsSync(envPath)) {
    fail(`missing ${envPath}. Create it from .env.sample and set database credentials.`);
  }

  const fileEnv = Object.fromEntries(
    Object.entries(parseEnv(readFileSync(envPath, "utf8"))).filter((entry) => entry[1] !== undefined),
  );
  const env = { ...fileEnv, ...process.env };
  const missingKeys = [...requiredDatabaseKeys, ...requiredAuthKeys].filter((key) => !env[key]);

  if (missingKeys.length > 0) {
    fail(`missing required variables in .env: ${missingKeys.join(", ")}.`);
  }

  const port = Number(env.DB_PORT);
  if (!Number.isInteger(port) || port <= 0) {
    fail(`DB_PORT must be a positive integer, received '${env.DB_PORT}'.`);
  }

  return { env, port };
}

async function smokeTestDatabase(env, port) {
  const requireFromDbPackage = createRequire(path.join(root, "packages/db/package.json"));
  const mysql = requireFromDbPackage("mysql2/promise");

  let connection;

  try {
    connection = await mysql.createConnection({
      host: env.DB_HOST,
      port,
      user: env.DB_USER,
      password: env.DB_PASSWORD,
      database: env.DB_NAME,
    });

    await connection.query("select 1 as ok");
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    fail(
      `database smoke test failed for ${env.DB_USER}@${env.DB_HOST}:${port}/${env.DB_NAME}. ${detail}`,
    );
  } finally {
    await connection?.end();
  }
}

const { env, port } = loadEnv();
await smokeTestDatabase(env, port);

console.info(
  `Preflight passed: .env found and database is reachable at ${env.DB_HOST}:${port}/${env.DB_NAME}.`,
);
