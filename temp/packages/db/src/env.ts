import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { parseEnv } from "node:util";

import { databaseEnvSchema, type DatabaseEnv } from "./database";

const databaseEnvKeys = [
  "DB_HOST",
  "DB_PORT",
  "DB_USER",
  "DB_PASSWORD",
  "DB_NAME",
] as const;

const fallbackCredentialKeys = ["DB_USER", "DB_PASSWORD", "DB_NAME"] as const;

export type DatabaseEnvKey = (typeof databaseEnvKeys)[number];

export interface LoadedDatabaseEnv {
  readonly cwd: string;
  readonly env: DatabaseEnv;
  readonly envFilePath: string | null;
  readonly explicitKeys: readonly DatabaseEnvKey[];
  readonly fallbackKeys: readonly DatabaseEnvKey[];
}

export function findNearestEnvFile(startDirectory = process.cwd()): string | null {
  let currentDirectory = path.resolve(startDirectory);

  while (true) {
    const envFilePath = path.join(currentDirectory, ".env");

    if (existsSync(envFilePath)) {
      return envFilePath;
    }

    const parentDirectory = path.dirname(currentDirectory);

    if (parentDirectory === currentDirectory) {
      return null;
    }

    currentDirectory = parentDirectory;
  }
}

function resolveConfiguredEnvFile(
  cwd: string,
  source: NodeJS.ProcessEnv,
): string | null {
  const configuredPath = source.DB_ENV_FILE ?? source.DATABASE_ENV_FILE;

  if (!configuredPath) {
    return null;
  }

  const envFilePath = path.resolve(cwd, configuredPath);
  return existsSync(envFilePath) ? envFilePath : null;
}

function loadEnvFileValues(envFilePath: string): Record<string, string> {
  const parsedEnv = parseEnv(readFileSync(envFilePath, "utf8"));

  return Object.fromEntries(
    Object.entries(parsedEnv).filter((entry): entry is [string, string] => entry[1] !== undefined),
  );
}

export function loadDatabaseEnv(options?: {
  readonly cwd?: string;
  readonly source?: NodeJS.ProcessEnv;
}): LoadedDatabaseEnv {
  const cwd = path.resolve(options?.cwd ?? process.cwd());
  const source = options?.source ?? process.env;
  const envFilePath = resolveConfiguredEnvFile(cwd, source) ?? findNearestEnvFile(cwd);
  const envFileValues = envFilePath ? loadEnvFileValues(envFilePath) : {};
  const mergedSource = {
    ...envFileValues,
    ...source,
  };

  const explicitKeys = databaseEnvKeys.filter((key) =>
    Object.prototype.hasOwnProperty.call(mergedSource, key),
  );
  const fallbackKeys = databaseEnvKeys.filter(
    (key) => !Object.prototype.hasOwnProperty.call(mergedSource, key),
  );

  return {
    cwd,
    env: databaseEnvSchema.parse(mergedSource),
    envFilePath,
    explicitKeys,
    fallbackKeys,
  };
}

export function usesFallbackDatabaseCredentials(envState: LoadedDatabaseEnv): boolean {
  return fallbackCredentialKeys.some((key) => envState.fallbackKeys.includes(key));
}
