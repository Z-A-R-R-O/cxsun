import { sql, type Kysely } from "kysely";

import { defineDatabaseMigration } from "../process/types";

type DynamicDatabase = Record<string, Record<string, unknown>>;

function asQueryDatabase(database: Kysely<unknown>) {
  return database as unknown as Kysely<DynamicDatabase>;
}

export const createTenantsMigration = defineDatabaseMigration({
  id: "organisation:tenants:001-create-tenants",
  appId: "organisation",
  moduleKey: "tenants",
  name: "Create tenants table",
  order: 10,
  up: async ({ database }) => {
    const queryDatabase = asQueryDatabase(database);

    await queryDatabase.schema
      .createTable("tenants")
      .ifNotExists()
      .addColumn("id", "bigint", (column) => column.primaryKey().autoIncrement())
      .addColumn("name", "varchar(160)", (column) => column.notNull())
      .addColumn("slug", "varchar(180)", (column) => column.notNull())
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
      .createIndex("uq_tenants_slug")
      .ifNotExists()
      .on("tenants")
      .column("slug")
      .unique()
      .execute();
  },
});
