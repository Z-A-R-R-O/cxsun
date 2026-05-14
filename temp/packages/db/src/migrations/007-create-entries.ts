import { sql, type Kysely } from "kysely";
import { defineDatabaseMigration } from "../process/types";

type DynamicDatabase = Record<string, Record<string, unknown>>;

function asQueryDatabase(database: Kysely<unknown>) {
  return database as unknown as Kysely<DynamicDatabase>;
}

export const createEntriesMigration = defineDatabaseMigration({
  id: "billing:entries:001-create-basic-billing",
  appId: "billing",
  moduleKey: "entries",
  name: "Create basic billing entry tables",
  order: 110,
  up: async ({ database }) => {
    const db = asQueryDatabase(database);
    await createBillingTable(db, "sales", "invoice_no", "invoice_date", "customer");
    await createBillingItemsTable(db, "sales_items", "sale_id");
    await createBillingTable(db, "purchases", "bill_no", "bill_date", "supplier");
    await createBillingItemsTable(db, "purchase_items", "purchase_id");
    await createMoneyTable(db, "payments", "payment_no", "payment_date", "payment_mode");
    await createAllocationsTable(db, "payment_allocations", "payment_id");
    await createMoneyTable(db, "receipts", "receipt_no", "receipt_date", "receipt_mode");
    await createAllocationsTable(db, "receipt_allocations", "receipt_id");
  },
});

async function createBillingTable(
  db: Kysely<DynamicDatabase>,
  table: string,
  documentNoColumn: string,
  documentDateColumn: string,
  partyPrefix: "customer" | "supplier",
) {
  let builder = db.schema
    .createTable(table)
    .ifNotExists()
    .addColumn("id", "bigint", (column) => column.primaryKey().autoIncrement())
    .addColumn("uuid", "varchar(80)", (column) => column.notNull())
    .addColumn("company_id", "bigint", (column) => column.notNull())
    .addColumn("accounting_year_id", "bigint", (column) => column.notNull())
    .addColumn(documentNoColumn, "varchar(80)", (column) => column.notNull())
    .addColumn(documentDateColumn, "datetime", (column) => column.notNull())
    .addColumn(`${partyPrefix}_id`, "varchar(120)")
    .addColumn(`${partyPrefix}_name`, "varchar(220)", (column) => column.notNull())
    .addColumn("billing_address", "text")
    .addColumn("place_of_supply", "varchar(160)")
    .addColumn("reference_no", "varchar(120)")
    .addColumn("due_date", "datetime")
    .addColumn("subtotal", sql`double`, (column) => column.notNull().defaultTo(0))
    .addColumn("discount_total", sql`double`, (column) => column.notNull().defaultTo(0))
    .addColumn("taxable_total", sql`double`, (column) => column.notNull().defaultTo(0))
    .addColumn("tax_total", sql`double`, (column) => column.notNull().defaultTo(0))
    .addColumn("round_off", sql`double`, (column) => column.notNull().defaultTo(0))
    .addColumn("grand_total", sql`double`, (column) => column.notNull().defaultTo(0))
    .addColumn("paid_amount", sql`double`, (column) => column.notNull().defaultTo(0))
    .addColumn("balance_amount", sql`double`, (column) => column.notNull().defaultTo(0))
    .addColumn("status", "varchar(40)", (column) => column.notNull())
    .addColumn("payment_status", "varchar(40)", (column) => column.notNull())
    .addColumn("notes", "text")
    .addColumn("terms", "text")
    .addColumn("is_active", "boolean", (column) => column.notNull().defaultTo(true))
    .addColumn("created_at", "datetime", (column) =>
      column.notNull().defaultTo(sql`CURRENT_TIMESTAMP`),
    )
    .addColumn("updated_at", "datetime", (column) =>
      column.notNull().defaultTo(sql`CURRENT_TIMESTAMP`),
    )
    .addColumn("deleted_at", "datetime");

  if (table === "sales") {
    builder = builder
      .addColumn("shipping_address", "text")
      .addColumn("price_list_id", "varchar(120)")
      .addColumn("eway_bill_no", "varchar(120)")
      .addColumn("eway_bill_date", "datetime");
  } else {
    builder = builder
      .addColumn("supplier_invoice_no", "varchar(120)")
      .addColumn("supplier_invoice_date", "datetime");
  }

  await builder.execute();
  await db.schema
    .createIndex(`uq_${table}_document_context`)
    .ifNotExists()
    .on(table)
    .columns(["company_id", "accounting_year_id", documentNoColumn])
    .unique()
    .execute();
}

async function createBillingItemsTable(
  db: Kysely<DynamicDatabase>,
  table: string,
  parentColumn: string,
) {
  await db.schema
    .createTable(table)
    .ifNotExists()
    .addColumn("id", "bigint", (column) => column.primaryKey().autoIncrement())
    .addColumn(parentColumn, "bigint", (column) => column.notNull())
    .addColumn("product_id", "varchar(120)")
    .addColumn("product_name", "varchar(220)", (column) => column.notNull())
    .addColumn("product_sku", "varchar(120)")
    .addColumn("po_no", "varchar(120)")
    .addColumn("dc_no", "varchar(120)")
    .addColumn("description", "text")
    .addColumn("size", "varchar(120)")
    .addColumn("colour", "varchar(120)")
    .addColumn("area_sq", sql`double`, (column) => column.notNull().defaultTo(0))
    .addColumn("hsn_code_id", "varchar(120)")
    .addColumn("unit_id", "varchar(120)")
    .addColumn("quantity", sql`double`, (column) => column.notNull().defaultTo(0))
    .addColumn("free_quantity", sql`double`, (column) => column.notNull().defaultTo(0))
    .addColumn("rate", sql`double`, (column) => column.notNull().defaultTo(0))
    .addColumn("mrp", sql`double`, (column) => column.notNull().defaultTo(0))
    .addColumn("discount_type", "varchar(40)")
    .addColumn("discount_value", sql`double`, (column) => column.notNull().defaultTo(0))
    .addColumn("discount_amount", sql`double`, (column) => column.notNull().defaultTo(0))
    .addColumn("tax_id", "varchar(120)")
    .addColumn("tax_rate", sql`double`, (column) => column.notNull().defaultTo(0))
    .addColumn("tax_amount", sql`double`, (column) => column.notNull().defaultTo(0))
    .addColumn("line_subtotal", sql`double`, (column) => column.notNull().defaultTo(0))
    .addColumn("line_total", sql`double`, (column) => column.notNull().defaultTo(0))
    .addColumn("sort_order", "integer", (column) => column.notNull().defaultTo(0))
    .addColumn("is_active", "boolean", (column) => column.notNull().defaultTo(true))
    .addColumn("created_at", "datetime", (column) =>
      column.notNull().defaultTo(sql`CURRENT_TIMESTAMP`),
    )
    .addColumn("updated_at", "datetime", (column) =>
      column.notNull().defaultTo(sql`CURRENT_TIMESTAMP`),
    )
    .execute();
}

async function createMoneyTable(
  db: Kysely<DynamicDatabase>,
  table: string,
  documentNoColumn: string,
  documentDateColumn: string,
  modeColumn: string,
) {
  await db.schema
    .createTable(table)
    .ifNotExists()
    .addColumn("id", "bigint", (column) => column.primaryKey().autoIncrement())
    .addColumn("uuid", "varchar(80)", (column) => column.notNull())
    .addColumn("company_id", "bigint", (column) => column.notNull())
    .addColumn("accounting_year_id", "bigint", (column) => column.notNull())
    .addColumn(documentNoColumn, "varchar(80)", (column) => column.notNull())
    .addColumn(documentDateColumn, "datetime", (column) => column.notNull())
    .addColumn("party_id", "varchar(120)")
    .addColumn("party_name", "varchar(220)", (column) => column.notNull())
    .addColumn("party_type", "varchar(80)")
    .addColumn("ledger_id", "varchar(120)")
    .addColumn("ledger_name", "varchar(180)")
    .addColumn(modeColumn, "varchar(80)", (column) => column.notNull())
    .addColumn("bank_account_id", "varchar(120)")
    .addColumn("reference_no", "varchar(120)")
    .addColumn("reference_date", "datetime")
    .addColumn("amount", sql`double`, (column) => column.notNull().defaultTo(0))
    .addColumn("tds_amount", sql`double`, (column) => column.notNull().defaultTo(0))
    .addColumn("discount_amount", sql`double`, (column) => column.notNull().defaultTo(0))
    .addColumn("round_off", sql`double`, (column) => column.notNull().defaultTo(0))
    .addColumn("net_amount", sql`double`, (column) => column.notNull().defaultTo(0))
    .addColumn("allocated_amount", sql`double`, (column) => column.notNull().defaultTo(0))
    .addColumn("unallocated_amount", sql`double`, (column) => column.notNull().defaultTo(0))
    .addColumn("status", "varchar(40)", (column) => column.notNull())
    .addColumn("notes", "text")
    .addColumn("is_active", "boolean", (column) => column.notNull().defaultTo(true))
    .addColumn("created_at", "datetime", (column) =>
      column.notNull().defaultTo(sql`CURRENT_TIMESTAMP`),
    )
    .addColumn("updated_at", "datetime", (column) =>
      column.notNull().defaultTo(sql`CURRENT_TIMESTAMP`),
    )
    .addColumn("deleted_at", "datetime")
    .execute();

  await db.schema
    .createIndex(`uq_${table}_document_context`)
    .ifNotExists()
    .on(table)
    .columns(["company_id", "accounting_year_id", documentNoColumn])
    .unique()
    .execute();
}

async function createAllocationsTable(
  db: Kysely<DynamicDatabase>,
  table: string,
  parentColumn: string,
) {
  await db.schema
    .createTable(table)
    .ifNotExists()
    .addColumn("id", "bigint", (column) => column.primaryKey().autoIncrement())
    .addColumn(parentColumn, "bigint", (column) => column.notNull())
    .addColumn("document_type", "varchar(80)", (column) => column.notNull())
    .addColumn("document_id", "varchar(120)")
    .addColumn("document_no", "varchar(120)", (column) => column.notNull())
    .addColumn("document_date", "datetime")
    .addColumn("document_total", sql`double`, (column) => column.notNull().defaultTo(0))
    .addColumn("previous_balance", sql`double`, (column) => column.notNull().defaultTo(0))
    .addColumn("allocated_amount", sql`double`, (column) => column.notNull().defaultTo(0))
    .addColumn("balance_after_allocation", sql`double`, (column) => column.notNull().defaultTo(0))
    .addColumn("sort_order", "integer", (column) => column.notNull().defaultTo(0))
    .addColumn("created_at", "datetime", (column) =>
      column.notNull().defaultTo(sql`CURRENT_TIMESTAMP`),
    )
    .addColumn("updated_at", "datetime", (column) =>
      column.notNull().defaultTo(sql`CURRENT_TIMESTAMP`),
    )
    .execute();
}
