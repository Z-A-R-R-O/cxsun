import { sql, type Kysely } from 'kysely'
import type { TenantDatabaseSchema } from '../../../../../infrastructure/tenant-database/tenant-database.schema.js'

export async function migrateAuditorGstFilingTables(database: Kysely<TenantDatabaseSchema>) {
  await sql`
    CREATE TABLE IF NOT EXISTS auditor_gst_filings (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      uuid CHAR(8) NOT NULL UNIQUE,
      contact_id INT NOT NULL,
      contact_name VARCHAR(255) NOT NULL,
      client_id INT NULL,
      client_name VARCHAR(255) NULL,
      month_id VARCHAR(32) NULL,
      month_name VARCHAR(64) NOT NULL,
      accounting_year_id VARCHAR(32) NULL,
      accounting_year_name VARCHAR(64) NOT NULL,
      gstr1_arn VARCHAR(191) NULL,
      gstr1_date DATE NULL,
      gstr3b_arn VARCHAR(191) NULL,
      gstr3b_date DATE NULL,
      status VARCHAR(32) NOT NULL DEFAULT 'pending',
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      deleted_at DATETIME NULL,
      UNIQUE KEY uq_auditor_gst_filing_period_contact (contact_id, month_name, accounting_year_name),
      INDEX idx_auditor_gst_filing_period (accounting_year_name, month_name),
      INDEX idx_auditor_gst_filing_contact (contact_id)
    )
  `.execute(database)

  await sql.raw(`ALTER TABLE auditor_gst_filings ADD COLUMN IF NOT EXISTS contact_id INT NULL AFTER uuid`).execute(database)
  await sql.raw(`ALTER TABLE auditor_gst_filings ADD COLUMN IF NOT EXISTS contact_name VARCHAR(255) NULL AFTER contact_id`).execute(database)
  await sql.raw(`ALTER TABLE auditor_gst_filings ADD COLUMN IF NOT EXISTS client_id INT NULL AFTER contact_name`).execute(database)
  await sql.raw(`ALTER TABLE auditor_gst_filings ADD COLUMN IF NOT EXISTS client_name VARCHAR(255) NULL AFTER client_id`).execute(database)
  await sql.raw(`
    UPDATE auditor_gst_filings
    SET contact_id = COALESCE(contact_id, client_id),
        contact_name = COALESCE(NULLIF(contact_name, ''), client_name)
    WHERE contact_id IS NULL
      AND client_id IS NOT NULL
  `).execute(database)
}
