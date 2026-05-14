import { sql, type Kysely } from "kysely";
import { defineDatabaseMigration } from "../process/types";

type DynamicDatabase = Record<string, Record<string, unknown>>;

function asQueryDatabase(database: Kysely<unknown>) {
  return database as unknown as Kysely<DynamicDatabase>;
}

export const extendSalesIndustryFieldsMigration = defineDatabaseMigration({
  id: "billing:entries:002-extend-sales-industry-fields",
  appId: "billing",
  moduleKey: "entries",
  name: "Extend sales entries with industry print fields",
  order: 111,
  up: async ({ database }) => {
    const db = asQueryDatabase(database);

    await sql`
      ALTER TABLE sales
        ADD COLUMN IF NOT EXISTS eway_bill_no varchar(120),
        ADD COLUMN IF NOT EXISTS eway_bill_date datetime,
        ADD COLUMN IF NOT EXISTS e_invoice_irn varchar(120),
        ADD COLUMN IF NOT EXISTS e_invoice_ack_no varchar(120),
        ADD COLUMN IF NOT EXISTS e_invoice_ack_date datetime,
        ADD COLUMN IF NOT EXISTS e_invoice_signed_qr text
    `.execute(db);

    await sql`
      ALTER TABLE sales_items
        ADD COLUMN IF NOT EXISTS po_no varchar(120),
        ADD COLUMN IF NOT EXISTS dc_no varchar(120),
        ADD COLUMN IF NOT EXISTS size varchar(120),
        ADD COLUMN IF NOT EXISTS colour varchar(120),
        ADD COLUMN IF NOT EXISTS area_sq double NOT NULL DEFAULT 0
    `.execute(db);

    await sql`
      ALTER TABLE purchase_items
        ADD COLUMN IF NOT EXISTS po_no varchar(120),
        ADD COLUMN IF NOT EXISTS dc_no varchar(120),
        ADD COLUMN IF NOT EXISTS size varchar(120),
        ADD COLUMN IF NOT EXISTS colour varchar(120),
        ADD COLUMN IF NOT EXISTS area_sq double NOT NULL DEFAULT 0
    `.execute(db);
  },
});
