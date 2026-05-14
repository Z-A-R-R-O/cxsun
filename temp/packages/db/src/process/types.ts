import type { Kysely } from "kysely";

export interface DatabaseProcessContext {
  readonly database: Kysely<unknown>;
}

export type DatabaseProcessLogger = Pick<Console, "error" | "info">;

export interface DatabaseProcessMigration {
  readonly id: string;
  readonly appId: string;
  readonly moduleKey: string;
  readonly name: string;
  readonly order: number;
  up(context: DatabaseProcessContext): Promise<void> | void;
}

export interface DatabaseProcessSeeder {
  readonly id: string;
  readonly appId: string;
  readonly moduleKey: string;
  readonly name: string;
  readonly order: number;
  run(context: DatabaseProcessContext): Promise<void> | void;
}

export interface AppDatabaseModule {
  readonly appId: string;
  readonly label: string;
  readonly order: number;
  readonly migrations: readonly DatabaseProcessMigration[];
  readonly seeders: readonly DatabaseProcessSeeder[];
}

export interface DatabaseProcessRunResult {
  readonly applied: string[];
  readonly skipped: string[];
}

export interface DatabasePrepareResult {
  readonly migrations: DatabaseProcessRunResult;
  readonly seeders: DatabaseProcessRunResult;
}

export interface DatabaseFreshResult extends DatabasePrepareResult {
  readonly dropped: {
    readonly views: number;
    readonly tables: number;
  };
}

export function defineDatabaseMigration(
  migration: DatabaseProcessMigration,
): DatabaseProcessMigration {
  return migration;
}

export function defineDatabaseSeeder(seeder: DatabaseProcessSeeder): DatabaseProcessSeeder {
  return seeder;
}

export function defineAppDatabaseModule(module: AppDatabaseModule): AppDatabaseModule {
  return module;
}
