import { describe, expect, it } from "vitest";
import type { Kysely } from "kysely";

import { runDatabaseCli } from "../src/cli";
import {
  prepareApplicationDatabase,
  runDatabaseMigrations,
  runDatabaseSeeders,
  databaseMigrations,
  databaseSeeders,
  systemMigrationTableName,
  systemSeederTableName,
} from "../src";

type Row = Record<string, unknown>;

class FakeDatabase {
  readonly tables = new Map<string, Row[]>();

  readonly schema = {
    createTable: (tableName: string) => new FakeCreateTableBuilder(this, tableName),
    createIndex: () => new FakeCreateIndexBuilder(),
  };

  selectFrom(tableName: string) {
    return new FakeSelectBuilder(this, tableName);
  }

  insertInto(tableName: string) {
    return new FakeInsertBuilder(this, tableName);
  }
}

class FakeCreateTableBuilder {
  constructor(
    private readonly database: FakeDatabase,
    private readonly tableName: string,
  ) {}

  ifNotExists() {
    return this;
  }

  addColumn() {
    return this;
  }

  async execute() {
    if (!this.database.tables.has(this.tableName)) {
      this.database.tables.set(this.tableName, []);
    }
  }
}

class FakeCreateIndexBuilder {
  ifNotExists() {
    return this;
  }

  on() {
    return this;
  }

  column() {
    return this;
  }

  unique() {
    return this;
  }

  async execute() {}
}

class FakeSelectBuilder {
  private selectedColumns: string[] | null = null;
  private whereClause: { readonly column: string; readonly value: unknown } | null = null;

  constructor(
    private readonly database: FakeDatabase,
    private readonly tableName: string,
  ) {}

  select(columns: string | string[]) {
    this.selectedColumns = Array.isArray(columns) ? columns : [columns];
    return this;
  }

  where(column: string, _operator: string, value: unknown) {
    this.whereClause = { column, value };
    return this;
  }

  async execute() {
    return this.readRows();
  }

  async executeTakeFirst() {
    return this.readRows()[0];
  }

  private readRows() {
    const rows = this.database.tables.get(this.tableName) ?? [];
    const filteredRows = this.whereClause
      ? rows.filter((row) => row[this.whereClause?.column ?? ""] === this.whereClause?.value)
      : rows;

    if (!this.selectedColumns) {
      return [...filteredRows];
    }

    return filteredRows.map((row) =>
      Object.fromEntries(this.selectedColumns?.map((column) => [column, row[column]]) ?? []),
    );
  }
}

class FakeInsertBuilder {
  private row: Row | null = null;

  constructor(
    private readonly database: FakeDatabase,
    private readonly tableName: string,
  ) {}

  values(row: Row) {
    this.row = row;
    return this;
  }

  async execute() {
    if (!this.row) {
      throw new Error("Fake insert requires values before execute.");
    }

    const rows = this.database.tables.get(this.tableName) ?? [];
    const nextRow = { ...this.row };

    if (nextRow.id === undefined) {
      nextRow.id = rows.length + 1;
    }

    this.database.tables.set(this.tableName, [...rows, nextRow]);
    return [{ insertId: nextRow.id }];
  }
}

const expectedMigrations = databaseMigrations.map((migration) => migration.id);
const expectedSeeders = databaseSeeders.map((seeder) => seeder.id);

function createFakeKysely() {
  return new FakeDatabase() as unknown as Kysely<unknown>;
}

describe("database process runner e2e", () => {
  it("prepares migrations and seeders once, then skips them", async () => {
    const database = createFakeKysely();

    const firstRun = await prepareApplicationDatabase(database);
    const secondRun = await prepareApplicationDatabase(database);
    const fakeDatabase = database as unknown as FakeDatabase;

    expect(firstRun.migrations.applied).toEqual(expectedMigrations);
    expect(firstRun.seeders.applied).toEqual(expectedSeeders);
    expect(secondRun.migrations.skipped).toEqual(firstRun.migrations.applied);
    expect(secondRun.seeders.skipped).toEqual(firstRun.seeders.applied);
    expect(fakeDatabase.tables.get("tenants")).toHaveLength(1);
    expect(fakeDatabase.tables.get(systemMigrationTableName)).toHaveLength(
      expectedMigrations.length,
    );
    expect(fakeDatabase.tables.get(systemSeederTableName)).toHaveLength(expectedSeeders.length);
  });

  it("runs migrations and seeders independently with ledger protection", async () => {
    const database = createFakeKysely();

    const migrationRun = await runDatabaseMigrations(database);
    const seedRun = await runDatabaseSeeders(database);
    const repeatedSeedRun = await runDatabaseSeeders(database);

    expect(migrationRun.applied).toEqual(expectedMigrations);
    expect(seedRun.applied).toEqual(expectedSeeders);
    expect(repeatedSeedRun.applied).toEqual([]);
    expect(repeatedSeedRun.skipped).toEqual(seedRun.applied);
  });

  it("refuses refresh without explicit confirmation before opening a connection", async () => {
    const originalExitCode = process.exitCode;

    process.exitCode = undefined;
    await runDatabaseCli(["refresh"]);

    expect(process.exitCode).toBe(1);
    process.exitCode = originalExitCode;
  });
});
