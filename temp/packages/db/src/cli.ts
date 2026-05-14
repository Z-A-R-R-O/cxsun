import type { Kysely } from "kysely";

import { createDatabaseConnection } from "./database";
import { loadDatabaseEnv, usesFallbackDatabaseCredentials, type LoadedDatabaseEnv } from "./env";
import { freshApplicationDatabase } from "./process/fresh";
import {
  listRegisteredDatabaseMigrations,
  listRegisteredDatabaseSeeders,
} from "./process/registry";
import {
  prepareApplicationDatabase,
  runDatabaseMigrations,
  runDatabaseSeeders,
} from "./process/runner";

type DatabaseCommand = "fresh" | "migrate" | "prepare" | "refresh" | "seed" | "status";

function resolveCommand(value: string | undefined): DatabaseCommand | null {
  switch (value) {
    case undefined:
    case "prepare":
      return "prepare";
    case "migrate":
    case "fresh":
    case "refresh":
    case "seed":
    case "status":
      return value;
    default:
      return null;
  }
}

function printUsage() {
  console.info(
    "Usage: node packages/db/dist/cli.js [prepare|migrate|seed|status|refresh|fresh] [--yes]",
  );
}

function hasRefreshConfirmation(args: readonly string[]) {
  return args.includes("--yes");
}

type DatabaseClientError = {
  readonly code?: string;
  readonly message?: string;
};

export function formatDatabaseCliError(error: unknown, envState: LoadedDatabaseEnv): string {
  const databaseError = error as DatabaseClientError;

  if (databaseError?.code === "ER_ACCESS_DENIED_ERROR") {
    const lines = [
      `Database connection failed for user '${envState.env.DB_USER}' on ${envState.env.DB_HOST}:${envState.env.DB_PORT}/${envState.env.DB_NAME}.`,
    ];

    if (envState.envFilePath) {
      lines.push(`Loaded environment file: ${envState.envFilePath}`);
    } else {
      lines.push(`No .env file was found while searching upward from ${envState.cwd}.`);
    }

    if (usesFallbackDatabaseCredentials(envState)) {
      lines.push(
        "Required DB_* variables are missing from the repository root .env or current shell. Define DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, and DB_NAME before running the database CLI.",
      );
    } else {
      lines.push(
        "Verify DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, and DB_NAME in the repository root .env or current shell, and ensure that MySQL grants this user access.",
      );
    }

    return lines.join("\n");
  }

  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

export async function runDatabaseCli(args = process.argv.slice(2)) {
  const command = resolveCommand(args[0]);
  const extraArgs = args.slice(1);

  if (!command) {
    printUsage();
    process.exitCode = 1;
    return;
  }

  if (command === "status") {
    console.info(`Registered migrations: ${listRegisteredDatabaseMigrations().length}`);
    console.info(`Registered seeders: ${listRegisteredDatabaseSeeders().length}`);
    return;
  }

  if ((command === "fresh" || command === "refresh") && !hasRefreshConfirmation(extraArgs)) {
    console.error("Refusing db:refresh without confirmation. Re-run with --yes.");
    process.exitCode = 1;
    return;
  }

  let envState: LoadedDatabaseEnv | null = null;
  let connection: ReturnType<typeof createDatabaseConnection> | null = null;

  try {
    envState = loadDatabaseEnv();
    connection = createDatabaseConnection(envState.env);

    const database = connection.db as unknown as Kysely<unknown>;

    if (command === "migrate") {
      const result = await runDatabaseMigrations(database, { logger: console });
      console.info(
        `Migrations applied: ${result.applied.length}, skipped: ${result.skipped.length}`,
      );
      return;
    }

    if (command === "seed") {
      const migrationResult = await runDatabaseMigrations(database, { logger: console });
      const result = await runDatabaseSeeders(database, { logger: console });
      console.info(
        `Seeders applied: ${result.applied.length}, skipped: ${result.skipped.length}. Migrations applied first: ${migrationResult.applied.length}`,
      );
      return;
    }

    if (command === "fresh" || command === "refresh") {
      const result = await freshApplicationDatabase(database, {
        databaseName: envState.env.DB_NAME,
        logger: console,
      });
      console.info(
        `Database refreshed. Dropped tables: ${result.dropped.tables}, dropped views: ${result.dropped.views}, migrations applied: ${result.migrations.applied.length}, seeders applied: ${result.seeders.applied.length}`,
      );
      return;
    }

    const result = await prepareApplicationDatabase(database, { logger: console });
    console.info(
      `Database prepared. Migrations applied: ${result.migrations.applied.length}, seeders applied: ${result.seeders.applied.length}`,
    );
  } catch (error) {
    console.error(envState ? formatDatabaseCliError(error, envState) : String(error));
    process.exitCode = 1;
  } finally {
    await connection?.destroy();
  }
}

if (process.argv[1]?.endsWith("cli.js")) {
  void runDatabaseCli().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
