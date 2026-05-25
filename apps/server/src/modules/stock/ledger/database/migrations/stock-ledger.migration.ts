import { sql, type Kysely } from 'kysely'
import type { TenantDatabaseSchema } from '../../../../../infrastructure/tenant-database/tenant-database.schema.js'

type TenantDatabase = Kysely<TenantDatabaseSchema>

export async function migrateStockLedgerTables(database: TenantDatabase) {
  await sql.raw(`
    CREATE TABLE IF NOT EXISTS stock_ledger_entries (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      uuid CHAR(8) NOT NULL UNIQUE,
      tenant_id INT NOT NULL,
      company_id INT NOT NULL,
      accounting_year_id INT NOT NULL,
      entry_no VARCHAR(120) NOT NULL,
      entry_date DATE NOT NULL,
      status VARCHAR(32) NOT NULL DEFAULT 'draft',
      source_type VARCHAR(80) NOT NULL DEFAULT 'purchaseReceipt',
      source_uuid VARCHAR(80) NULL,
      source_no VARCHAR(120) NULL,
      notes TEXT NULL,
      created_by VARCHAR(191) NOT NULL,
      updated_by VARCHAR(191) NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      deleted_at DATETIME NULL,
      UNIQUE KEY uq_stock_ledger_entries_no (tenant_id, company_id, accounting_year_id, entry_no),
      INDEX idx_stock_ledger_entries_date (tenant_id, entry_date, id),
      INDEX idx_stock_ledger_entries_status (tenant_id, status)
    )
  `).execute(database)

  await sql.raw(`
    CREATE TABLE IF NOT EXISTS stock_settings (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      uuid CHAR(8) NOT NULL UNIQUE,
      stock_ledger_entry_id INT NULL,
      tenant_id INT NOT NULL,
      company_id INT NOT NULL,
      serialization_enabled TINYINT(1) NOT NULL DEFAULT 1,
      batch_enabled TINYINT(1) NOT NULL DEFAULT 1,
      default_warehouse_id VARCHAR(80) NULL,
      default_warehouse_name VARCHAR(191) NULL,
      serial_format VARCHAR(160) NOT NULL DEFAULT '{####}',
      batch_format VARCHAR(160) NOT NULL DEFAULT '{yy}{week}',
      barcode_format VARCHAR(220) NOT NULL DEFAULT '{productCode}-{batchNo}-{serialNo}',
      barcode_mode VARCHAR(24) NOT NULL DEFAULT 'readable',
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uq_stock_settings_company (tenant_id, company_id)
    )
  `).execute(database)

  await sql.raw(`
    CREATE TABLE IF NOT EXISTS stock_ledger_movements (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      uuid CHAR(8) NOT NULL UNIQUE,
      tenant_id INT NOT NULL,
      company_id INT NOT NULL,
      accounting_year_id INT NOT NULL,
      warehouse_id VARCHAR(80) NULL,
      warehouse_name VARCHAR(191) NULL,
      product_id VARCHAR(80) NULL,
      product_code VARCHAR(80) NULL,
      product_name VARCHAR(191) NOT NULL,
      source_type VARCHAR(80) NOT NULL,
      source_id VARCHAR(80) NULL,
      source_uuid VARCHAR(80) NULL,
      source_no VARCHAR(120) NULL,
      source_date DATE NULL,
      direction VARCHAR(24) NOT NULL,
      quantity_in DOUBLE NOT NULL DEFAULT 0,
      quantity_out DOUBLE NOT NULL DEFAULT 0,
      batch_no VARCHAR(120) NULL,
      serial_no VARCHAR(120) NULL,
      barcode_value VARCHAR(220) NULL,
      status VARCHAR(32) NOT NULL DEFAULT 'posted',
      actor_email VARCHAR(191) NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_stock_ledger_tenant_product (tenant_id, product_id, created_at),
      INDEX idx_stock_ledger_barcode (tenant_id, barcode_value),
      INDEX idx_stock_ledger_source (tenant_id, source_type, source_uuid)
    )
  `).execute(database)

  await sql.raw(`
    CREATE TABLE IF NOT EXISTS stock_live_balances (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      uuid CHAR(8) NOT NULL UNIQUE,
      tenant_id INT NOT NULL,
      company_id INT NOT NULL,
      accounting_year_id INT NOT NULL,
      warehouse_id VARCHAR(80) NULL,
      warehouse_name VARCHAR(191) NULL,
      product_id VARCHAR(80) NULL,
      product_code VARCHAR(80) NULL,
      product_name VARCHAR(191) NOT NULL,
      batch_no VARCHAR(120) NULL,
      serial_no VARCHAR(120) NULL,
      barcode_value VARCHAR(220) NULL,
      quantity_on_hand DOUBLE NOT NULL DEFAULT 0,
      quantity_reserved DOUBLE NOT NULL DEFAULT 0,
      quantity_available DOUBLE NOT NULL DEFAULT 0,
      last_movement_id INT NULL,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uq_stock_live_balance (tenant_id, company_id, accounting_year_id, warehouse_id, product_id, batch_no, serial_no, barcode_value),
      INDEX idx_stock_live_product (tenant_id, product_id, quantity_available),
      INDEX idx_stock_live_barcode (tenant_id, barcode_value)
    )
  `).execute(database)

  await sql.raw(`
    CREATE TABLE IF NOT EXISTS stock_serializations (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      uuid CHAR(8) NOT NULL UNIQUE,
      stock_ledger_entry_id INT NULL,
      tenant_id INT NOT NULL,
      company_id INT NOT NULL,
      accounting_year_id INT NOT NULL,
      purchase_receipt_id INT NOT NULL,
      purchase_receipt_uuid CHAR(8) NOT NULL,
      purchase_receipt_no VARCHAR(120) NOT NULL,
      purchase_receipt_date DATE NOT NULL,
      purchase_receipt_item_id INT NOT NULL,
      purchase_receipt_item_uuid CHAR(8) NULL,
      product_id VARCHAR(80) NULL,
      product_code VARCHAR(80) NULL,
      product_name VARCHAR(191) NOT NULL,
      warehouse_id VARCHAR(80) NULL,
      warehouse_name VARCHAR(191) NULL,
      expected_quantity DOUBLE NOT NULL DEFAULT 0,
      generated_quantity DOUBLE NOT NULL DEFAULT 0,
      verified_quantity DOUBLE NOT NULL DEFAULT 0,
      pending_quantity DOUBLE NOT NULL DEFAULT 0,
      mode VARCHAR(24) NOT NULL DEFAULT 'partial',
      batch_no VARCHAR(120) NULL,
      serial_format VARCHAR(160) NOT NULL,
      barcode_format VARCHAR(220) NOT NULL,
      barcode_mode VARCHAR(24) NOT NULL DEFAULT 'readable',
      status VARCHAR(32) NOT NULL DEFAULT 'draft',
      created_by VARCHAR(191) NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_stock_serializations_entry (tenant_id, stock_ledger_entry_id),
      INDEX idx_stock_serializations_receipt (tenant_id, purchase_receipt_id, purchase_receipt_item_id),
      INDEX idx_stock_serializations_status (tenant_id, status)
    )
  `).execute(database)

  await sql.raw(`
    CREATE INDEX IF NOT EXISTS idx_stock_serializations_entry ON stock_serializations (tenant_id, stock_ledger_entry_id)
  `).execute(database)

  await sql.raw(`
    CREATE TABLE IF NOT EXISTS stock_serialization_items (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      uuid CHAR(8) NOT NULL UNIQUE,
      serialization_id INT NOT NULL,
      serial_no VARCHAR(120) NOT NULL,
      batch_no VARCHAR(120) NULL,
      barcode_value VARCHAR(220) NOT NULL,
      quantity DOUBLE NOT NULL DEFAULT 1,
      is_verified TINYINT(1) NOT NULL DEFAULT 0,
      verified_at DATETIME NULL,
      verified_by VARCHAR(191) NULL,
      stock_movement_id INT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uq_stock_serialization_barcode (barcode_value),
      INDEX idx_stock_serialization_items_parent (serialization_id, id),
      INDEX idx_stock_serialization_items_verified (serialization_id, is_verified)
    )
  `).execute(database)
}
