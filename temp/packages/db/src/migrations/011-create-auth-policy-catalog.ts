import { sql, type Kysely } from "kysely";

import { defineDatabaseMigration } from "../process/types";

type DynamicDatabase = Record<string, Record<string, unknown>>;

function asQueryDatabase(database: Kysely<unknown>) {
  return database as unknown as Kysely<DynamicDatabase>;
}

export const createAuthPolicyCatalogMigration = defineDatabaseMigration({
  id: "security:auth:002-create-auth-policy-catalog",
  appId: "security",
  moduleKey: "auth",
  name: "Create auth policy action and permission module catalog",
  order: 901,
  up: async ({ database }) => {
    const db = asQueryDatabase(database);

    await db.schema
      .createTable("auth_policy_actions")
      .ifNotExists()
      .addColumn("id", "bigint", (column) => column.primaryKey().autoIncrement())
      .addColumn("action_key", "varchar(60)", (column) => column.notNull().unique())
      .addColumn("name", "varchar(160)", (column) => column.notNull())
      .addColumn("description", "varchar(255)")
      .addColumn("is_system", "boolean", (column) => column.notNull().defaultTo(false))
      .addColumn("is_active", "boolean", (column) => column.notNull().defaultTo(true))
      .addColumn("created_at", "datetime", (column) =>
        column.notNull().defaultTo(sql`CURRENT_TIMESTAMP`),
      )
      .addColumn("updated_at", "datetime", (column) =>
        column.notNull().defaultTo(sql`CURRENT_TIMESTAMP`),
      )
      .execute();

    await db.schema
      .createTable("auth_permission_modules")
      .ifNotExists()
      .addColumn("id", "bigint", (column) => column.primaryKey().autoIncrement())
      .addColumn("module_key", "varchar(100)", (column) => column.notNull().unique())
      .addColumn("name", "varchar(160)", (column) => column.notNull())
      .addColumn("bounded_context", "varchar(120)", (column) => column.notNull())
      .addColumn("description", "varchar(255)")
      .addColumn("is_system", "boolean", (column) => column.notNull().defaultTo(false))
      .addColumn("is_active", "boolean", (column) => column.notNull().defaultTo(true))
      .addColumn("created_at", "datetime", (column) =>
        column.notNull().defaultTo(sql`CURRENT_TIMESTAMP`),
      )
      .addColumn("updated_at", "datetime", (column) =>
        column.notNull().defaultTo(sql`CURRENT_TIMESTAMP`),
      )
      .execute();
  },
});
