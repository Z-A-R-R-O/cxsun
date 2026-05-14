import { sql, type Kysely } from "kysely";

import { defineDatabaseMigration } from "../process/types";

type DynamicDatabase = Record<string, Record<string, unknown>>;

function asQueryDatabase(database: Kysely<unknown>) {
  return database as unknown as Kysely<DynamicDatabase>;
}

export const createIndustriesMigration = defineDatabaseMigration({
  id: "organisation:industries:001-create-industries",
  appId: "organisation",
  moduleKey: "industries",
  name: "Create industries table",
  order: 20,
  up: async ({ database }) => {
    const queryDatabase = asQueryDatabase(database);

    await queryDatabase.schema
      .createTable("industries")
      .ifNotExists()
      .addColumn("id", "bigint", (column) => column.primaryKey().autoIncrement())
      .addColumn("code", "varchar(64)", (column) => column.notNull())
      .addColumn("name", "varchar(160)", (column) => column.notNull())
      .addColumn("is_active", "boolean", (column) => column.notNull().defaultTo(true))
      .addColumn("created_at", "datetime", (column) =>
        column.notNull().defaultTo(sql`CURRENT_TIMESTAMP`),
      )
      .addColumn("updated_at", "datetime", (column) =>
        column.notNull().defaultTo(sql`CURRENT_TIMESTAMP`),
      )
      .addColumn("deleted_at", "datetime")
      .execute();

    await queryDatabase.schema
      .createIndex("uq_industries_code")
      .ifNotExists()
      .on("industries")
      .column("code")
      .unique()
      .execute();

    await queryDatabase.schema
      .createIndex("uq_industries_name")
      .ifNotExists()
      .on("industries")
      .column("name")
      .unique()
      .execute();
  },
});
