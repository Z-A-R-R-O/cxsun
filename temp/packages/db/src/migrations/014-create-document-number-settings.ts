import { sql, type Kysely } from "kysely";
import { defineDatabaseMigration } from "../process/types";

type DynamicDatabase = Record<string, Record<string, unknown>>;

function asQueryDatabase(database: Kysely<unknown>) {
  return database as unknown as Kysely<DynamicDatabase>;
}

export const createDocumentNumberSettingsMigration = defineDatabaseMigration({
  id: "billing:document-settings:001-create-document-number-settings",
  appId: "billing",
  moduleKey: "document-settings",
  name: "Create document number settings",
  order: 136,
  up: async ({ database }) => {
    const db = asQueryDatabase(database);
    await db.schema
      .createTable("document_number_settings")
      .ifNotExists()
      .addColumn("id", "bigint", (column) => column.primaryKey().autoIncrement())
      .addColumn("company_id", "bigint", (column) => column.notNull())
      .addColumn("accounting_year_id", "bigint", (column) => column.notNull())
      .addColumn("entry_kind", "varchar(40)", (column) => column.notNull())
      .addColumn("prefix", "varchar(40)", (column) => column.notNull())
      .addColumn("separator", "varchar(8)", (column) => column.notNull().defaultTo("-"))
      .addColumn("next_number", "integer", (column) => column.notNull().defaultTo(1))
      .addColumn("padding", "integer", (column) => column.notNull().defaultTo(4))
      .addColumn("auto_enabled", "boolean", (column) => column.notNull().defaultTo(true))
      .addColumn("created_at", "datetime", (column) =>
        column.notNull().defaultTo(sql`CURRENT_TIMESTAMP`),
      )
      .addColumn("updated_at", "datetime", (column) =>
        column.notNull().defaultTo(sql`CURRENT_TIMESTAMP`),
      )
      .execute();

    await db.schema
      .createIndex("uq_document_number_settings_context_kind")
      .ifNotExists()
      .on("document_number_settings")
      .columns(["company_id", "accounting_year_id", "entry_kind"])
      .unique()
      .execute();
  },
});
