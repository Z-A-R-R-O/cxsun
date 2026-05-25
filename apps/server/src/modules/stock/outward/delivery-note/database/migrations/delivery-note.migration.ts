import { sql, type Kysely } from 'kysely'
import type { TenantDatabaseSchema } from '../../../../../../infrastructure/tenant-database/tenant-database.schema.js'

type TenantDatabase = Kysely<TenantDatabaseSchema>

export async function migrateDeliveryNoteTables(database: TenantDatabase) {
  await sql.raw(`
    CREATE TABLE IF NOT EXISTS stock_delivery_notes (
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
      INDEX idx_stock_delivery_notes_tenant_entry (tenant_id, entry_date, id),
      INDEX idx_stock_delivery_notes_company_year (company_id, accounting_year_id)
    )
  `).execute(database)

  await sql.raw(`
    CREATE TABLE IF NOT EXISTS stock_delivery_note_items (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      uuid CHAR(8) NULL,
      delivery_note_id INT NOT NULL,
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
      INDEX idx_stock_delivery_note_items_parent (delivery_note_id, sort_order)
    )
  `).execute(database)

  await sql.raw(`
    CREATE TABLE IF NOT EXISTS stock_delivery_note_comments (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      uuid CHAR(8) NULL,
      delivery_note_id INT NOT NULL,
      author_email VARCHAR(191) NOT NULL,
      body TEXT NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_stock_delivery_note_comments_parent (delivery_note_id, id)
    )
  `).execute(database)

  await sql.raw(`
    CREATE TABLE IF NOT EXISTS stock_delivery_note_activities (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      uuid CHAR(8) NULL,
      delivery_note_id INT NOT NULL,
      activity_type VARCHAR(80) NOT NULL,
      actor_email VARCHAR(191) NOT NULL,
      message VARCHAR(255) NOT NULL,
      payload JSON NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_stock_delivery_note_activities_parent (delivery_note_id, id)
    )
  `).execute(database)
}
