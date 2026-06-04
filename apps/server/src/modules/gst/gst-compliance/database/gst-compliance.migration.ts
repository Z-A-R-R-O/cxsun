import { sql, type Kysely } from 'kysely'
import type { TenantDatabaseSchema } from '../../../../infrastructure/tenant-database/tenant-database.schema.js'
import { whiteBooksProductionBaseUrl, whiteBooksSandboxBaseUrl } from '../../gsp/whitebooks/index.js'

type TenantDatabase = Kysely<TenantDatabaseSchema>

export async function migrateGstComplianceTables(database: TenantDatabase) {
  await sql.raw(`
    CREATE TABLE IF NOT EXISTS gst_provider_settings (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      uuid CHAR(8) NOT NULL UNIQUE,
      tenant_id INT NOT NULL,
      company_id INT NOT NULL,
      provider VARCHAR(40) NOT NULL DEFAULT 'whitebooks',
      environment VARCHAR(24) NOT NULL DEFAULT 'sandbox',
      base_url VARCHAR(240) NOT NULL DEFAULT '${whiteBooksSandboxBaseUrl}',
      email VARCHAR(191) NOT NULL,
      username VARCHAR(120) NOT NULL,
      password_secret TEXT NULL,
      client_id VARCHAR(160) NOT NULL,
      client_secret TEXT NULL,
      gstin VARCHAR(32) NOT NULL,
      ip_address VARCHAR(80) NOT NULL DEFAULT '0.0.0.0',
      is_enabled TINYINT(1) NOT NULL DEFAULT 0,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uq_gst_provider_company_gstin (tenant_id, company_id, provider, environment, gstin),
      INDEX idx_gst_provider_company (tenant_id, company_id)
    )
  `).execute(database)

  await sql.raw(`
    CREATE TABLE IF NOT EXISTS gst_provider_tokens (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      uuid CHAR(8) NOT NULL UNIQUE,
      tenant_id INT NOT NULL,
      setting_id INT NOT NULL,
      provider VARCHAR(40) NOT NULL DEFAULT 'whitebooks',
      environment VARCHAR(24) NOT NULL DEFAULT 'sandbox',
      purpose VARCHAR(32) NOT NULL DEFAULT 'einvoice_eway',
      gstin VARCHAR(32) NOT NULL,
      auth_token TEXT NOT NULL,
      sek TEXT NULL,
      token_expiry DATETIME NULL,
      raw_response_json LONGTEXT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uq_gst_provider_token_setting (tenant_id, setting_id),
      INDEX idx_gst_provider_token_expiry (tenant_id, provider, gstin, token_expiry)
    )
  `).execute(database)

  await sql.raw(`ALTER TABLE gst_provider_tokens ADD COLUMN IF NOT EXISTS purpose VARCHAR(32) NOT NULL DEFAULT 'einvoice_eway' AFTER environment`).execute(database)
  await sql.raw(`ALTER TABLE gst_provider_tokens DROP INDEX IF EXISTS uq_gst_provider_token_setting`).execute(database)
  await sql.raw(`ALTER TABLE gst_provider_tokens ADD UNIQUE KEY IF NOT EXISTS uq_gst_provider_token_setting_purpose (tenant_id, setting_id, purpose)`).execute(database)

  await sql.raw(`
    CREATE TABLE IF NOT EXISTS gst_compliance_documents (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      uuid CHAR(8) NOT NULL UNIQUE,
      tenant_id INT NOT NULL,
      company_id INT NOT NULL,
      provider VARCHAR(40) NOT NULL DEFAULT 'whitebooks',
      environment VARCHAR(24) NOT NULL DEFAULT 'sandbox',
      source_type VARCHAR(64) NOT NULL,
      source_id INT NULL,
      source_uuid VARCHAR(80) NULL,
      document_type VARCHAR(32) NOT NULL DEFAULT 'INV',
      document_no VARCHAR(120) NOT NULL,
      document_date DATE NULL,
      gstin VARCHAR(32) NULL,
      irn VARCHAR(120) NULL,
      ack_no VARCHAR(120) NULL,
      ack_date DATETIME NULL,
      signed_invoice LONGTEXT NULL,
      signed_qr LONGTEXT NULL,
      eway_bill_no VARCHAR(120) NULL,
      eway_bill_date DATETIME NULL,
      eway_valid_upto DATETIME NULL,
      irn_status VARCHAR(32) NOT NULL DEFAULT 'not_generated',
      eway_status VARCHAR(32) NOT NULL DEFAULT 'not_generated',
      last_operation_id INT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uq_gst_compliance_source (tenant_id, source_type, source_uuid),
      INDEX idx_gst_compliance_document_no (tenant_id, company_id, document_no),
      INDEX idx_gst_compliance_irn (tenant_id, irn),
      INDEX idx_gst_compliance_eway (tenant_id, eway_bill_no)
    )
  `).execute(database)

  await sql.raw(`
    CREATE TABLE IF NOT EXISTS gst_compliance_operations (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      uuid CHAR(8) NOT NULL UNIQUE,
      tenant_id INT NOT NULL,
      company_id INT NOT NULL,
      setting_id INT NULL,
      provider VARCHAR(40) NOT NULL DEFAULT 'whitebooks',
      environment VARCHAR(24) NOT NULL DEFAULT 'sandbox',
      operation VARCHAR(80) NOT NULL,
      source_type VARCHAR(64) NULL,
      source_id INT NULL,
      source_uuid VARCHAR(80) NULL,
      document_no VARCHAR(120) NULL,
      method VARCHAR(12) NOT NULL,
      endpoint VARCHAR(260) NOT NULL,
      http_status INT NULL,
      provider_status VARCHAR(80) NULL,
      success TINYINT(1) NOT NULL DEFAULT 0,
      error_message TEXT NULL,
      request_json LONGTEXT NULL,
      response_json LONGTEXT NULL,
      created_by VARCHAR(191) NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_gst_operations_source (tenant_id, source_type, source_uuid, id),
      INDEX idx_gst_operations_kind (tenant_id, company_id, operation, id),
      INDEX idx_gst_operations_success (tenant_id, success, id)
    )
  `).execute(database)

  await sql.raw(`
    UPDATE gst_provider_settings
    SET provider = 'whitebooks',
        base_url = CASE
          WHEN environment = 'production' THEN '${whiteBooksProductionBaseUrl}'
          ELSE '${whiteBooksSandboxBaseUrl}'
        END,
        updated_at = CURRENT_TIMESTAMP
    WHERE provider = 'mastergst'
       OR base_url = 'https://api.mastergst.com'
  `).execute(database)

  await sql.raw(`UPDATE gst_provider_tokens SET provider = 'whitebooks' WHERE provider = 'mastergst'`).execute(database)
  await sql.raw(`UPDATE gst_compliance_documents SET provider = 'whitebooks' WHERE provider = 'mastergst'`).execute(database)
  await sql.raw(`UPDATE gst_compliance_operations SET provider = 'whitebooks' WHERE provider = 'mastergst'`).execute(database)
}
