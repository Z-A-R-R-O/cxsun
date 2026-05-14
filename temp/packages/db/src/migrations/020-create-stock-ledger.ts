import { sql, type Kysely } from "kysely";
import { defineDatabaseMigration } from "../process/types";

type DynamicDatabase = Record<string, Record<string, unknown>>;

function asQueryDatabase(database: Kysely<unknown>) {
  return database as unknown as Kysely<DynamicDatabase>;
}

export const createStockLedgerMigration = defineDatabaseMigration({
  id: "billing:stock:001-create-stock-ledger",
  appId: "billing",
  moduleKey: "stock",
  name: "Create stock warehouse, barcode, serial, batch, movement, and balance tables",
  order: 128,
  up: async ({ database }) => {
    const db = asQueryDatabase(database);

    await db.schema
      .createTable("stock_warehouses")
      .ifNotExists()
      .addColumn("id", "bigint", (column) => column.primaryKey().autoIncrement())
      .addColumn("company_id", "bigint", (column) => column.notNull())
      .addColumn("code", "varchar(80)", (column) => column.notNull())
      .addColumn("name", "varchar(180)", (column) => column.notNull())
      .addColumn("common_warehouse_id", "varchar(120)")
      .addColumn("address", "text")
      .addColumn("is_default", "boolean", (column) => column.notNull().defaultTo(false))
      .addColumn("is_active", "boolean", (column) => column.notNull().defaultTo(true))
      .addColumn("created_at", "datetime", (column) =>
        column.notNull().defaultTo(sql`CURRENT_TIMESTAMP`),
      )
      .addColumn("updated_at", "datetime", (column) =>
        column.notNull().defaultTo(sql`CURRENT_TIMESTAMP`),
      )
      .execute();

    await db.schema
      .createIndex("uq_stock_warehouses_company_code")
      .ifNotExists()
      .on("stock_warehouses")
      .columns(["company_id", "code"])
      .unique()
      .execute();

    await db.schema
      .createTable("stock_batches")
      .ifNotExists()
      .addColumn("id", "bigint", (column) => column.primaryKey().autoIncrement())
      .addColumn("company_id", "bigint", (column) => column.notNull())
      .addColumn("product_id", "varchar(120)", (column) => column.notNull())
      .addColumn("batch_no", "varchar(120)", (column) => column.notNull())
      .addColumn("mfg_date", "datetime")
      .addColumn("expiry_date", "datetime")
      .addColumn("notes", "text")
      .addColumn("is_active", "boolean", (column) => column.notNull().defaultTo(true))
      .addColumn("created_at", "datetime", (column) =>
        column.notNull().defaultTo(sql`CURRENT_TIMESTAMP`),
      )
      .addColumn("updated_at", "datetime", (column) =>
        column.notNull().defaultTo(sql`CURRENT_TIMESTAMP`),
      )
      .execute();

    await db.schema
      .createIndex("uq_stock_batches_company_product_batch")
      .ifNotExists()
      .on("stock_batches")
      .columns(["company_id", "product_id", "batch_no"])
      .unique()
      .execute();

    await db.schema
      .createTable("stock_serial_numbers")
      .ifNotExists()
      .addColumn("id", "bigint", (column) => column.primaryKey().autoIncrement())
      .addColumn("company_id", "bigint", (column) => column.notNull())
      .addColumn("product_id", "varchar(120)", (column) => column.notNull())
      .addColumn("serial_no", "varchar(160)", (column) => column.notNull())
      .addColumn("warehouse_id", "bigint")
      .addColumn("batch_id", "bigint")
      .addColumn("status", "varchar(40)", (column) => column.notNull().defaultTo("available"))
      .addColumn("created_at", "datetime", (column) =>
        column.notNull().defaultTo(sql`CURRENT_TIMESTAMP`),
      )
      .addColumn("updated_at", "datetime", (column) =>
        column.notNull().defaultTo(sql`CURRENT_TIMESTAMP`),
      )
      .execute();

    await db.schema
      .createIndex("uq_stock_serials_company_serial")
      .ifNotExists()
      .on("stock_serial_numbers")
      .columns(["company_id", "serial_no"])
      .unique()
      .execute();

    await db.schema
      .createTable("stock_barcodes")
      .ifNotExists()
      .addColumn("id", "bigint", (column) => column.primaryKey().autoIncrement())
      .addColumn("company_id", "bigint", (column) => column.notNull())
      .addColumn("product_id", "varchar(120)", (column) => column.notNull())
      .addColumn("barcode", "varchar(160)", (column) => column.notNull())
      .addColumn("unit_id", "varchar(120)")
      .addColumn("batch_id", "bigint")
      .addColumn("serial_id", "bigint")
      .addColumn("is_primary", "boolean", (column) => column.notNull().defaultTo(false))
      .addColumn("created_at", "datetime", (column) =>
        column.notNull().defaultTo(sql`CURRENT_TIMESTAMP`),
      )
      .addColumn("updated_at", "datetime", (column) =>
        column.notNull().defaultTo(sql`CURRENT_TIMESTAMP`),
      )
      .execute();

    await db.schema
      .createIndex("uq_stock_barcodes_company_barcode")
      .ifNotExists()
      .on("stock_barcodes")
      .columns(["company_id", "barcode"])
      .unique()
      .execute();

    await db.schema
      .createTable("stock_movements")
      .ifNotExists()
      .addColumn("id", "bigint", (column) => column.primaryKey().autoIncrement())
      .addColumn("company_id", "bigint", (column) => column.notNull())
      .addColumn("accounting_year_id", "bigint", (column) => column.notNull())
      .addColumn("product_id", "varchar(120)", (column) => column.notNull())
      .addColumn("warehouse_id", "bigint", (column) => column.notNull())
      .addColumn("batch_id", "bigint")
      .addColumn("serial_id", "bigint")
      .addColumn("barcode_id", "bigint")
      .addColumn("source_type", "varchar(60)", (column) => column.notNull())
      .addColumn("source_id", "varchar(120)", (column) => column.notNull())
      .addColumn("source_item_id", "varchar(120)")
      .addColumn("movement_date", "datetime", (column) => column.notNull())
      .addColumn("direction", "varchar(20)", (column) => column.notNull())
      .addColumn("quantity", sql`double`, (column) => column.notNull().defaultTo(0))
      .addColumn("unit_cost", sql`double`, (column) => column.notNull().defaultTo(0))
      .addColumn("amount", sql`double`, (column) => column.notNull().defaultTo(0))
      .addColumn("remarks", "text")
      .addColumn("created_at", "datetime", (column) =>
        column.notNull().defaultTo(sql`CURRENT_TIMESTAMP`),
      )
      .execute();

    await db.schema
      .createIndex("idx_stock_movements_context")
      .ifNotExists()
      .on("stock_movements")
      .columns(["company_id", "accounting_year_id", "product_id", "warehouse_id"])
      .execute();

    await db.schema
      .createIndex("idx_stock_movements_source")
      .ifNotExists()
      .on("stock_movements")
      .columns(["source_type", "source_id"])
      .execute();

    await db.schema
      .createTable("stock_balances")
      .ifNotExists()
      .addColumn("id", "bigint", (column) => column.primaryKey().autoIncrement())
      .addColumn("company_id", "bigint", (column) => column.notNull())
      .addColumn("accounting_year_id", "bigint", (column) => column.notNull())
      .addColumn("product_id", "varchar(120)", (column) => column.notNull())
      .addColumn("warehouse_id", "bigint", (column) => column.notNull())
      .addColumn("batch_id", "bigint", (column) => column.notNull().defaultTo(0))
      .addColumn("quantity_on_hand", sql`double`, (column) => column.notNull().defaultTo(0))
      .addColumn("quantity_in", sql`double`, (column) => column.notNull().defaultTo(0))
      .addColumn("quantity_out", sql`double`, (column) => column.notNull().defaultTo(0))
      .addColumn("stock_value", sql`double`, (column) => column.notNull().defaultTo(0))
      .addColumn("updated_at", "datetime", (column) =>
        column.notNull().defaultTo(sql`CURRENT_TIMESTAMP`),
      )
      .execute();

    await db.schema
      .createIndex("uq_stock_balances_context")
      .ifNotExists()
      .on("stock_balances")
      .columns(["company_id", "accounting_year_id", "product_id", "warehouse_id", "batch_id"])
      .unique()
      .execute();
  },
});
