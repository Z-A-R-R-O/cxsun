import { sql, type Kysely } from "kysely";
import { defineDatabaseMigration } from "../process/types";

type DynamicDatabase = Record<string, Record<string, unknown>>;

function asQueryDatabase(database: Kysely<unknown>) {
  return database as unknown as Kysely<DynamicDatabase>;
}

const entryTables = [
  ["sales", "invoice_no"],
  ["purchases", "bill_no"],
  ["payments", "payment_no"],
  ["receipts", "receipt_no"],
] as const;

export const addEntryCompanyContextMigration = defineDatabaseMigration({
  id: "billing:entries:004-add-company-accounting-year-context",
  appId: "billing",
  moduleKey: "entries",
  name: "Add company and accounting year context to entries",
  order: 113,
  up: async ({ database }) => {
    const db = asQueryDatabase(database);

    for (const [table, documentNoColumn] of entryTables) {
      await sql`
        ALTER TABLE ${sql.table(table)}
          ADD COLUMN IF NOT EXISTS company_id bigint NOT NULL DEFAULT 1,
          ADD COLUMN IF NOT EXISTS accounting_year_id bigint NOT NULL DEFAULT 1
      `.execute(db);

      await sql`
        ALTER TABLE ${sql.table(table)}
          DROP INDEX IF EXISTS ${sql.id(`uq_${table}_document_no`)}
      `.execute(db);

      await db.schema
        .createIndex(`uq_${table}_document_context`)
        .ifNotExists()
        .on(table)
        .columns(["company_id", "accounting_year_id", documentNoColumn])
        .unique()
        .execute();
    }
  },
});
