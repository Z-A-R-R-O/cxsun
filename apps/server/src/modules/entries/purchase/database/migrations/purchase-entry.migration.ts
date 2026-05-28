import { sql, type Kysely } from 'kysely'
import type { TenantDatabaseSchema } from '../../../../../infrastructure/tenant-database/tenant-database.schema.js'

type TenantDatabase = Kysely<TenantDatabaseSchema>

export async function migratePurchaseEntryTables(database: TenantDatabase) {
  await sql.raw(`
    CREATE TABLE IF NOT EXISTS purchase_entries (
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
      INDEX idx_purchase_entries_tenant_entry (tenant_id, entry_date, id),
      INDEX idx_purchase_entries_company_year (company_id, accounting_year_id)
    )
  `).execute(database)

  await sql.raw(`
    CREATE TABLE IF NOT EXISTS purchase_entry_items (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      uuid CHAR(8) NULL,
      purchase_entry_id INT NOT NULL,
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
      INDEX idx_purchase_entry_items_parent (purchase_entry_id, sort_order)
    )
  `).execute(database)

  await sql.raw(`
    CREATE TABLE IF NOT EXISTS purchase_entry_comments (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      uuid CHAR(8) NULL,
      purchase_entry_id INT NOT NULL,
      author_email VARCHAR(191) NOT NULL,
      body TEXT NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_purchase_entry_comments_parent (purchase_entry_id, id)
    )
  `).execute(database)

  await sql.raw(`
    CREATE TABLE IF NOT EXISTS purchase_entry_activities (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      uuid CHAR(8) NULL,
      purchase_entry_id INT NOT NULL,
      activity_type VARCHAR(80) NOT NULL,
      actor_email VARCHAR(191) NOT NULL,
      message VARCHAR(255) NOT NULL,
      payload JSON NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_purchase_entry_activities_parent (purchase_entry_id, id)
    )
  `).execute(database)

  await sql.raw(`
    UPDATE purchase_entry_items item
    JOIN purchase_entries entry ON entry.id = item.purchase_entry_id
    SET
      item.tax_amount = CASE
        WHEN COALESCE(entry.place_of_supply, 'cgst-sgst') = 'igst'
          THEN ROUND(GREATEST(0, item.quantity * item.rate - item.discount_amount) * item.tax_rate / 100, 2)
        ELSE ROUND(ROUND((GREATEST(0, item.quantity * item.rate - item.discount_amount) * item.tax_rate / 100) / 2, 2) * 2, 2)
      END,
      item.line_total = CASE
        WHEN COALESCE(entry.place_of_supply, 'cgst-sgst') = 'igst'
          THEN ROUND(GREATEST(0, item.quantity * item.rate - item.discount_amount) + ROUND(GREATEST(0, item.quantity * item.rate - item.discount_amount) * item.tax_rate / 100, 2), 2)
        ELSE ROUND(GREATEST(0, item.quantity * item.rate - item.discount_amount) + ROUND(ROUND((GREATEST(0, item.quantity * item.rate - item.discount_amount) * item.tax_rate / 100) / 2, 2) * 2, 2), 2)
      END,
      item.updated_at = CURRENT_TIMESTAMP
  `).execute(database)

  await sql.raw(`
    UPDATE purchase_entries entry
    JOIN (
      SELECT
        purchase_entry_id,
        ROUND(SUM(ROUND(quantity * rate, 2)), 2) AS subtotal,
        ROUND(SUM(discount_amount), 2) AS discount_total,
        ROUND(SUM(GREATEST(0, quantity * rate - discount_amount)), 2) AS taxable_total,
        ROUND(SUM(tax_amount), 2) AS tax_total
      FROM purchase_entry_items
      GROUP BY purchase_entry_id
    ) totals ON totals.purchase_entry_id = entry.id
    SET
      entry.subtotal = totals.subtotal,
      entry.discount_total = totals.discount_total,
      entry.taxable_total = totals.taxable_total,
      entry.tax_total = totals.tax_total,
      entry.grand_total = ROUND(totals.taxable_total + totals.tax_total + entry.round_off, 2),
      entry.balance_amount = ROUND(totals.taxable_total + totals.tax_total + entry.round_off - entry.paid_amount, 2),
      entry.updated_at = CURRENT_TIMESTAMP
  `).execute(database)
}

