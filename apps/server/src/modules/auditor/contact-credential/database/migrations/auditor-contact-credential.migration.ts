import { sql, type Kysely } from 'kysely'
import type { TenantDatabaseSchema } from '../../../../../infrastructure/tenant-database/tenant-database.schema.js'

export async function migrateAuditorContactCredentialTables(database: Kysely<TenantDatabaseSchema>) {
  await sql`
    CREATE TABLE IF NOT EXISTS auditor_contact_credentials (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      uuid CHAR(8) NOT NULL UNIQUE,
      contact_id INT NOT NULL,
      contact_name VARCHAR(255) NOT NULL,
      gst_user VARCHAR(255) NULL,
      gst_pass VARCHAR(255) NULL,
      einvoice_user VARCHAR(255) NULL,
      einvoice_pass VARCHAR(255) NULL,
      eway_user VARCHAR(255) NULL,
      eway_pass VARCHAR(255) NULL,
      einvoice_api_user VARCHAR(255) NULL,
      einvoice_api_pass VARCHAR(255) NULL,
      eway_api_user VARCHAR(255) NULL,
      eway_api_pass VARCHAR(255) NULL,
      email_account_user VARCHAR(255) NULL,
      email_account_pass VARCHAR(255) NULL,
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      deleted_at DATETIME NULL,
      UNIQUE KEY uq_auditor_contact_credentials_contact (contact_id),
      INDEX idx_auditor_contact_credentials_name (contact_name)
    )
  `.execute(database)
}
