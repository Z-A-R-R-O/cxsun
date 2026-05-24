import { sql, type Kysely } from 'kysely'
import type { TenantDatabaseSchema } from '../../../../../../infrastructure/tenant-database/tenant-database.schema.js'

type TenantDatabase = Kysely<TenantDatabaseSchema>

export async function migratePurchaseReceiptTables(database: TenantDatabase) {
  await sql.raw(`
    CREATE TABLE IF NOT EXISTS stock_purchase_receipts (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      uuid CHAR(8) NOT NULL UNIQUE,
      tenant_id INT NOT NULL,
      company_id INT NOT NULL,
      accounting_year_id INT NOT NULL,
      entry_no VARCHAR(80) NOT NULL,
      entry_date DATE NOT NULL,
      supplier_id VARCHAR(80) NULL,
      supplier_name VARCHAR(191) NOT NULL,
      supplier_gstin VARCHAR(40) NULL,
      supplier_state_code VARCHAR(40) NULL,
      supplier_state_name VARCHAR(120) NULL,
      supplier_bill_no VARCHAR(120) NULL,
      supplier_bill_date DATE NULL,
      billing_address TEXT NULL,
      shipping_address TEXT NULL,
      place_of_supply VARCHAR(120) NULL,
      reference_no VARCHAR(120) NULL,
      due_date DATE NULL,
      subtotal DOUBLE NOT NULL DEFAULT 0,
      discount_total DOUBLE NOT NULL DEFAULT 0,
      taxable_total DOUBLE NOT NULL DEFAULT 0,
      tax_total DOUBLE NOT NULL DEFAULT 0,
      round_off DOUBLE NOT NULL DEFAULT 0,
      grand_total DOUBLE NOT NULL DEFAULT 0,
      paid_amount DOUBLE NOT NULL DEFAULT 0,
      balance_amount DOUBLE NOT NULL DEFAULT 0,
      status VARCHAR(32) NOT NULL DEFAULT 'draft',
      payment_status VARCHAR(32) NOT NULL DEFAULT 'unpaid',
      irn VARCHAR(120) NULL,
      ack_no VARCHAR(120) NULL,
      ack_date DATE NULL,
      signed_qr TEXT NULL,
      eway_bill_no VARCHAR(120) NULL,
      eway_bill_date DATE NULL,
      transport_id VARCHAR(80) NULL,
      transport_name VARCHAR(191) NULL,
      transport_gst VARCHAR(40) NULL,
      transport_address TEXT NULL,
      transport_contact_no VARCHAR(80) NULL,
      transport_contact_person VARCHAR(120) NULL,
      vehicle_no VARCHAR(80) NULL,
      eway_part VARCHAR(20) NULL,
      notes TEXT NULL,
      terms TEXT NULL,
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      deleted_at DATETIME NULL,
      INDEX idx_stock_purchase_receipts_tenant_entry (tenant_id, entry_date, id),
      INDEX idx_stock_purchase_receipts_company_year (company_id, accounting_year_id)
    )
  `).execute(database)

  await sql.raw(`
    CREATE TABLE IF NOT EXISTS stock_purchase_receipt_items (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      uuid CHAR(8) NULL,
      purchase_receipt_id INT NOT NULL,
      product_id VARCHAR(80) NULL,
      product_name VARCHAR(191) NOT NULL,
      description TEXT NULL,
      colour VARCHAR(120) NULL,
      hsn_code VARCHAR(80) NULL,
      po_no VARCHAR(120) NULL,
      dc_no VARCHAR(120) NULL,
      size VARCHAR(120) NULL,
      unit VARCHAR(80) NULL,
      quantity DOUBLE NOT NULL DEFAULT 0,
      rate DOUBLE NOT NULL DEFAULT 0,
      discount_amount DOUBLE NOT NULL DEFAULT 0,
      tax_rate DOUBLE NOT NULL DEFAULT 0,
      tax_amount DOUBLE NOT NULL DEFAULT 0,
      line_total DOUBLE NOT NULL DEFAULT 0,
      sort_order INT NOT NULL DEFAULT 1,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_stock_purchase_receipt_items_parent (purchase_receipt_id, sort_order)
    )
  `).execute(database)

  await addPurchaseReceiptColumnIfMissing(database, 'accounting_year_id', 'INT NOT NULL DEFAULT 0')
  await addPurchaseReceiptColumnIfMissing(database, 'entry_no', "VARCHAR(80) NOT NULL DEFAULT ''")
  await addPurchaseReceiptColumnIfMissing(database, 'entry_date', 'DATE NULL')
  await addPurchaseReceiptColumnIfMissing(database, 'supplier_id', 'VARCHAR(80) NULL')
  await addPurchaseReceiptColumnIfMissing(database, 'supplier_name', "VARCHAR(191) NOT NULL DEFAULT ''")
  await addPurchaseReceiptColumnIfMissing(database, 'billing_address', 'TEXT NULL')
  await addPurchaseReceiptColumnIfMissing(database, 'shipping_address', 'TEXT NULL')
  await addPurchaseReceiptColumnIfMissing(database, 'place_of_supply', 'VARCHAR(120) NULL')
  await addPurchaseReceiptColumnIfMissing(database, 'due_date', 'DATE NULL')
  await addPurchaseReceiptColumnIfMissing(database, 'subtotal', 'DOUBLE NOT NULL DEFAULT 0')
  await addPurchaseReceiptColumnIfMissing(database, 'discount_total', 'DOUBLE NOT NULL DEFAULT 0')
  await addPurchaseReceiptColumnIfMissing(database, 'taxable_total', 'DOUBLE NOT NULL DEFAULT 0')
  await addPurchaseReceiptColumnIfMissing(database, 'tax_total', 'DOUBLE NOT NULL DEFAULT 0')
  await addPurchaseReceiptColumnIfMissing(database, 'round_off', 'DOUBLE NOT NULL DEFAULT 0')
  await addPurchaseReceiptColumnIfMissing(database, 'grand_total', 'DOUBLE NOT NULL DEFAULT 0')
  await addPurchaseReceiptColumnIfMissing(database, 'paid_amount', 'DOUBLE NOT NULL DEFAULT 0')
  await addPurchaseReceiptColumnIfMissing(database, 'balance_amount', 'DOUBLE NOT NULL DEFAULT 0')
  await addPurchaseReceiptColumnIfMissing(database, 'payment_status', "VARCHAR(32) NOT NULL DEFAULT 'unpaid'")
  await addPurchaseReceiptColumnIfMissing(database, 'supplier_gstin', 'VARCHAR(40) NULL')
  await addPurchaseReceiptColumnIfMissing(database, 'supplier_state_code', 'VARCHAR(40) NULL')
  await addPurchaseReceiptColumnIfMissing(database, 'supplier_state_name', 'VARCHAR(120) NULL')
  await addPurchaseReceiptColumnIfMissing(database, 'supplier_bill_no', 'VARCHAR(120) NULL')
  await addPurchaseReceiptColumnIfMissing(database, 'supplier_bill_date', 'DATE NULL')
  await addPurchaseReceiptColumnIfMissing(database, 'irn', 'VARCHAR(120) NULL')
  await addPurchaseReceiptColumnIfMissing(database, 'ack_no', 'VARCHAR(120) NULL')
  await addPurchaseReceiptColumnIfMissing(database, 'ack_date', 'DATE NULL')
  await addPurchaseReceiptColumnIfMissing(database, 'signed_qr', 'TEXT NULL')
  await addPurchaseReceiptColumnIfMissing(database, 'eway_bill_no', 'VARCHAR(120) NULL')
  await addPurchaseReceiptColumnIfMissing(database, 'eway_bill_date', 'DATE NULL')
  await addPurchaseReceiptColumnIfMissing(database, 'transport_id', 'VARCHAR(80) NULL')
  await addPurchaseReceiptColumnIfMissing(database, 'transport_name', 'VARCHAR(191) NULL')
  await addPurchaseReceiptColumnIfMissing(database, 'transport_gst', 'VARCHAR(40) NULL')
  await addPurchaseReceiptColumnIfMissing(database, 'transport_address', 'TEXT NULL')
  await addPurchaseReceiptColumnIfMissing(database, 'transport_contact_no', 'VARCHAR(80) NULL')
  await addPurchaseReceiptColumnIfMissing(database, 'transport_contact_person', 'VARCHAR(120) NULL')
  await addPurchaseReceiptColumnIfMissing(database, 'vehicle_no', 'VARCHAR(80) NULL')
  await addPurchaseReceiptColumnIfMissing(database, 'eway_part', 'VARCHAR(20) NULL')
  await addPurchaseReceiptColumnIfMissing(database, 'notes', 'TEXT NULL')
  await addPurchaseReceiptColumnIfMissing(database, 'terms', 'TEXT NULL')
  await addPurchaseReceiptColumnIfMissing(database, 'is_active', 'TINYINT(1) NOT NULL DEFAULT 1')
  await addPurchaseReceiptColumnIfMissing(database, 'created_at', 'DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP')
  await addPurchaseReceiptColumnIfMissing(database, 'updated_at', 'DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP')
  await addPurchaseReceiptColumnIfMissing(database, 'deleted_at', 'DATETIME NULL')
  await relaxLegacyPurchaseReceiptColumn(database, 'receipt_no', "VARCHAR(80) NOT NULL DEFAULT ''")
  await relaxLegacyPurchaseReceiptColumn(database, 'receipt_date', 'DATE NULL')
  await relaxLegacyPurchaseReceiptColumn(database, 'created_by', "VARCHAR(180) NOT NULL DEFAULT ''")

  await addPurchaseItemColumnIfMissing(database, 'uuid', 'CHAR(8) NULL')
  await addPurchaseItemColumnIfMissing(database, 'purchase_receipt_id', 'INT NOT NULL DEFAULT 0')
  await addPurchaseItemColumnIfMissing(database, 'product_id', 'VARCHAR(80) NULL')
  await addPurchaseItemColumnIfMissing(database, 'product_name', "VARCHAR(191) NOT NULL DEFAULT ''")
  await addPurchaseItemColumnIfMissing(database, 'description', 'TEXT NULL')
  await addPurchaseItemColumnIfMissing(database, 'colour', 'VARCHAR(120) NULL')
  await addPurchaseItemColumnIfMissing(database, 'hsn_code', 'VARCHAR(80) NULL')
  await addPurchaseItemColumnIfMissing(database, 'po_no', 'VARCHAR(120) NULL')
  await addPurchaseItemColumnIfMissing(database, 'dc_no', 'VARCHAR(120) NULL')
  await addPurchaseItemColumnIfMissing(database, 'size', 'VARCHAR(120) NULL')
  await addPurchaseItemColumnIfMissing(database, 'unit', 'VARCHAR(80) NULL')
  await addPurchaseItemColumnIfMissing(database, 'rate', 'DOUBLE NOT NULL DEFAULT 0')
  await addPurchaseItemColumnIfMissing(database, 'discount_amount', 'DOUBLE NOT NULL DEFAULT 0')
  await addPurchaseItemColumnIfMissing(database, 'tax_rate', 'DOUBLE NOT NULL DEFAULT 0')
  await addPurchaseItemColumnIfMissing(database, 'tax_amount', 'DOUBLE NOT NULL DEFAULT 0')
  await addPurchaseItemColumnIfMissing(database, 'line_total', 'DOUBLE NOT NULL DEFAULT 0')
  await addPurchaseItemColumnIfMissing(database, 'sort_order', 'INT NOT NULL DEFAULT 1')
  await addPurchaseItemColumnIfMissing(database, 'created_at', 'DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP')
  await addPurchaseItemColumnIfMissing(database, 'updated_at', 'DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP')

  await sql.raw(`
    CREATE TABLE IF NOT EXISTS stock_purchase_receipt_comments (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      uuid CHAR(8) NULL,
      purchase_receipt_id INT NOT NULL,
      author_email VARCHAR(191) NOT NULL,
      body TEXT NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_stock_purchase_receipt_comments_parent (purchase_receipt_id, id)
    )
  `).execute(database)

  await sql.raw(`
    CREATE TABLE IF NOT EXISTS stock_purchase_receipt_activities (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      uuid CHAR(8) NULL,
      purchase_receipt_id INT NOT NULL,
      activity_type VARCHAR(80) NOT NULL,
      actor_email VARCHAR(191) NOT NULL,
      message VARCHAR(255) NOT NULL,
      payload JSON NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_stock_purchase_receipt_activities_parent (purchase_receipt_id, id)
    )
  `).execute(database)
}

async function addPurchaseReceiptColumnIfMissing(database: TenantDatabase, column: string, definition: string) {
  const existing = await sql<{ COLUMN_NAME: string }>`
    SELECT COLUMN_NAME
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'stock_purchase_receipts'
      AND COLUMN_NAME = ${column}
  `.execute(database)

  if (existing.rows.length > 0) return

  await sql.raw(`ALTER TABLE stock_purchase_receipts ADD COLUMN ${column} ${definition}`).execute(database)
}

async function addPurchaseItemColumnIfMissing(database: TenantDatabase, column: string, definition: string) {
  const existing = await sql<{ COLUMN_NAME: string }>`
    SELECT COLUMN_NAME
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'stock_purchase_receipt_items'
      AND COLUMN_NAME = ${column}
  `.execute(database)

  if (existing.rows.length > 0) return

  await sql.raw(`ALTER TABLE stock_purchase_receipt_items ADD COLUMN ${column} ${definition}`).execute(database)
}

async function relaxLegacyPurchaseReceiptColumn(database: TenantDatabase, column: string, definition: string) {
  const existing = await sql<{ COLUMN_NAME: string }>`
    SELECT COLUMN_NAME
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'stock_purchase_receipts'
      AND COLUMN_NAME = ${column}
  `.execute(database)

  if (existing.rows.length === 0) return

  await sql.raw(`ALTER TABLE stock_purchase_receipts MODIFY COLUMN ${column} ${definition}`).execute(database)
}

