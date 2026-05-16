import { sql, type Kysely } from 'kysely'
import type { TenantDatabaseSchema } from '../../../../../infrastructure/tenant-database/tenant-database.schema.js'

type TenantDatabase = Kysely<TenantDatabaseSchema>

export async function migrateSalesEntryTables(database: TenantDatabase) {
  await sql.raw(`
    CREATE TABLE IF NOT EXISTS sales_entries (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      uuid CHAR(8) NOT NULL UNIQUE,
      tenant_id INT NOT NULL,
      company_id INT NOT NULL,
      accounting_year_id INT NOT NULL,
      invoice_no VARCHAR(80) NOT NULL,
      invoice_date DATE NOT NULL,
      customer_id VARCHAR(80) NULL,
      customer_name VARCHAR(191) NOT NULL,
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
      notes TEXT NULL,
      terms TEXT NULL,
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      deleted_at DATETIME NULL,
      INDEX idx_sales_entries_tenant_invoice (tenant_id, invoice_date, id),
      INDEX idx_sales_entries_company_year (company_id, accounting_year_id)
    )
  `).execute(database)

  await sql.raw(`
    CREATE TABLE IF NOT EXISTS sales_entry_items (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      uuid CHAR(8) NULL,
      sales_entry_id INT NOT NULL,
      product_id VARCHAR(80) NULL,
      product_name VARCHAR(191) NOT NULL,
      description TEXT NULL,
      hsn_code VARCHAR(80) NULL,
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
      INDEX idx_sales_entry_items_parent (sales_entry_id, sort_order)
    )
  `).execute(database)

  await sql.raw(`
    CREATE TABLE IF NOT EXISTS sales_entry_comments (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      uuid CHAR(8) NULL,
      sales_entry_id INT NOT NULL,
      author_email VARCHAR(191) NOT NULL,
      body TEXT NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_sales_entry_comments_parent (sales_entry_id, id)
    )
  `).execute(database)

  await sql.raw(`
    CREATE TABLE IF NOT EXISTS sales_entry_activities (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      uuid CHAR(8) NULL,
      sales_entry_id INT NOT NULL,
      activity_type VARCHAR(80) NOT NULL,
      actor_email VARCHAR(191) NOT NULL,
      message VARCHAR(255) NOT NULL,
      payload JSON NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_sales_entry_activities_parent (sales_entry_id, id)
    )
  `).execute(database)
}
