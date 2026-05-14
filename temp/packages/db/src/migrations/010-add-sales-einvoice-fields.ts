import { sql, type Kysely } from "kysely";
import { defineDatabaseMigration } from "../process/types";

type DynamicDatabase = Record<string, Record<string, unknown>>;

function asQueryDatabase(database: Kysely<unknown>) {
  return database as unknown as Kysely<DynamicDatabase>;
}

export const addSalesEInvoiceFieldsMigration = defineDatabaseMigration({
  id: "billing:entries:003-add-sales-einvoice-fields",
  appId: "billing",
  moduleKey: "entries",
  name: "Add e-invoice fields to existing sales entries",
  order: 112,
  up: async ({ database }) => {
    const db = asQueryDatabase(database);

    await sql`
      ALTER TABLE sales
        ADD COLUMN IF NOT EXISTS e_invoice_irn varchar(120),
        ADD COLUMN IF NOT EXISTS e_invoice_ack_no varchar(120),
        ADD COLUMN IF NOT EXISTS e_invoice_ack_date datetime,
        ADD COLUMN IF NOT EXISTS e_invoice_signed_qr text
    `.execute(db);
  },
});
