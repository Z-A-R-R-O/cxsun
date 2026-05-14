import type { Kysely } from "kysely";

import { listRegisteredDatabaseMigrations, listRegisteredDatabaseSeeders } from "./registry";
import { systemMigrationTableName, systemSeederTableName } from "./table-names";
import type {
  DatabasePrepareResult,
  DatabaseProcessLogger,
  DatabaseProcessMigration,
  DatabaseProcessRunResult,
  DatabaseProcessSeeder,
} from "./types";

type DynamicDatabase = Record<string, Record<string, unknown>>;

function asQueryDatabase(database: Kysely<unknown>) {
  return database as unknown as Kysely<DynamicDatabase>;
}

async function ensureProcessLedgerTable(database: Kysely<unknown>, tableName: string) {
  await asQueryDatabase(database)
    .schema.createTable(tableName)
    .ifNotExists()
    .addColumn("id", "varchar(191)", (column) => column.primaryKey())
    .addColumn("app_id", "varchar(100)", (column) => column.notNull())
    .addColumn("module_key", "varchar(100)", (column) => column.notNull())
    .addColumn("name", "varchar(255)", (column) => column.notNull())
    .addColumn("applied_at", "varchar(40)", (column) => column.notNull())
    .execute();
}

export async function ensureDatabaseProcessLedger(database: Kysely<unknown>) {
  await ensureProcessLedgerTable(database, systemMigrationTableName);
  await ensureProcessLedgerTable(database, systemSeederTableName);
}

async function listAppliedProcessIds(database: Kysely<unknown>, tableName: string) {
  const rows = (await asQueryDatabase(database)
    .selectFrom(tableName)
    .select(["id"])
    .execute()) as Array<{ id: string }>;

  return new Set(rows.map((row) => row.id));
}

async function recordAppliedProcess(
  database: Kysely<unknown>,
  tableName: string,
  process: DatabaseProcessMigration | DatabaseProcessSeeder,
) {
  await asQueryDatabase(database)
    .insertInto(tableName)
    .values({
      id: process.id,
      app_id: process.appId,
      module_key: process.moduleKey,
      name: process.name,
      applied_at: new Date().toISOString(),
    })
    .execute();
}

export async function runDatabaseMigrations(
  database: Kysely<unknown>,
  options: {
    readonly logger?: DatabaseProcessLogger;
    readonly migrations?: readonly DatabaseProcessMigration[];
  } = {},
): Promise<DatabaseProcessRunResult> {
  await ensureDatabaseProcessLedger(database);

  const logger = options.logger;
  const migrations = options.migrations ?? listRegisteredDatabaseMigrations();
  const appliedMigrationIds = await listAppliedProcessIds(database, systemMigrationTableName);
  const result: DatabaseProcessRunResult = {
    applied: [],
    skipped: [],
  };

  for (const migration of migrations) {
    if (appliedMigrationIds.has(migration.id)) {
      result.skipped.push(migration.id);
      continue;
    }

    logger?.info(`Applying migration ${migration.id} (${migration.appId}/${migration.moduleKey})`);

    await migration.up({ database });
    await recordAppliedProcess(database, systemMigrationTableName, migration);
    appliedMigrationIds.add(migration.id);

    result.applied.push(migration.id);
  }

  return result;
}

export async function runDatabaseSeeders(
  database: Kysely<unknown>,
  options: {
    readonly logger?: DatabaseProcessLogger;
    readonly seeders?: readonly DatabaseProcessSeeder[];
  } = {},
): Promise<DatabaseProcessRunResult> {
  await ensureDatabaseProcessLedger(database);

  const logger = options.logger;
  const seeders = options.seeders ?? listRegisteredDatabaseSeeders();
  const appliedSeederIds = await listAppliedProcessIds(database, systemSeederTableName);
  const result: DatabaseProcessRunResult = {
    applied: [],
    skipped: [],
  };

  for (const seeder of seeders) {
    if (appliedSeederIds.has(seeder.id)) {
      result.skipped.push(seeder.id);
      continue;
    }

    logger?.info(`Applying seeder ${seeder.id} (${seeder.appId}/${seeder.moduleKey})`);

    await seeder.run({ database });
    await recordAppliedProcess(database, systemSeederTableName, seeder);
    appliedSeederIds.add(seeder.id);

    result.applied.push(seeder.id);
  }

  return result;
}

export async function prepareApplicationDatabase(
  database: Kysely<unknown>,
  options: {
    readonly logger?: DatabaseProcessLogger;
  } = {},
): Promise<DatabasePrepareResult> {
  const migrations = await runDatabaseMigrations(database, {
    logger: options.logger,
  });
  const seeders = await runDatabaseSeeders(database, {
    logger: options.logger,
  });

  return {
    migrations,
    seeders,
  };
}
