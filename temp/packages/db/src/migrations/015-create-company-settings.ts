import { sql, type Kysely } from "kysely";
import { defineDatabaseMigration } from "../process/types";

type DynamicDatabase = Record<string, Record<string, unknown>>;

function asQueryDatabase(database: Kysely<unknown>) {
  return database as unknown as Kysely<DynamicDatabase>;
}

export const createCompanySettingsMigration = defineDatabaseMigration({
  id: "billing:company-settings:001-create-company-settings",
  appId: "billing",
  moduleKey: "company-settings",
  name: "Create company settings",
  order: 137,
  up: async ({ database }) => {
    const db = asQueryDatabase(database);
    await db.schema
      .createTable("company_settings")
      .ifNotExists()
      .addColumn("id", "bigint", (column) => column.primaryKey().autoIncrement())
      .addColumn("company_id", "bigint", (column) => column.notNull())
      .addColumn("setting_key", "varchar(80)", (column) => column.notNull())
      .addColumn("values_json", "text", (column) => column.notNull())
      .addColumn("created_at", "datetime", (column) =>
        column.notNull().defaultTo(sql`CURRENT_TIMESTAMP`),
      )
      .addColumn("updated_at", "datetime", (column) =>
        column.notNull().defaultTo(sql`CURRENT_TIMESTAMP`),
      )
      .execute();

    await db.schema
      .createIndex("uq_company_settings_company_key")
      .ifNotExists()
      .on("company_settings")
      .columns(["company_id", "setting_key"])
      .unique()
      .execute();
  },
});
