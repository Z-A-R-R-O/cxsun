import { sql, type Kysely } from 'kysely'

type DynamicDatabase = Record<string, Record<string, unknown>>

export async function migrateTallyTables(database: Kysely<DynamicDatabase>) {
  await sql.raw(`
    CREATE TABLE IF NOT EXISTS tally_settings (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      uuid CHAR(8) NOT NULL UNIQUE,
      tenant_id INT NOT NULL,
      company_id INT NULL,
      enabled TINYINT(1) NOT NULL DEFAULT 0,
      tally_host VARCHAR(191) NOT NULL DEFAULT 'localhost',
      tally_port INT NOT NULL DEFAULT 9000,
      company_name VARCHAR(220) NULL,
      sync_sales TINYINT(1) NOT NULL DEFAULT 1,
      sync_purchase TINYINT(1) NOT NULL DEFAULT 1,
      sync_receipt TINYINT(1) NOT NULL DEFAULT 1,
      sync_payment TINYINT(1) NOT NULL DEFAULT 1,
      sync_inventory TINYINT(1) NOT NULL DEFAULT 0,
      sync_contacts TINYINT(1) NOT NULL DEFAULT 1,
      sync_direction VARCHAR(40) NOT NULL DEFAULT 'export',
      settings JSON NULL,
      updated_by VARCHAR(191) NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uq_tally_settings_tenant_company (tenant_id, company_id)
    )
  `).execute(database)

  await sql.raw(`
    CREATE TABLE IF NOT EXISTS tally_sync_jobs (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      uuid CHAR(8) NOT NULL UNIQUE,
      tenant_id INT NOT NULL,
      company_id INT NULL,
      job_type VARCHAR(80) NOT NULL,
      direction VARCHAR(40) NOT NULL DEFAULT 'export',
      status VARCHAR(40) NOT NULL DEFAULT 'queued',
      requested_by VARCHAR(191) NOT NULL,
      started_at DATETIME NULL,
      finished_at DATETIME NULL,
      total_records INT NOT NULL DEFAULT 0,
      success_count INT NOT NULL DEFAULT 0,
      failed_count INT NOT NULL DEFAULT 0,
      error_message TEXT NULL,
      payload JSON NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_tally_jobs_tenant (tenant_id, status, created_at),
      INDEX idx_tally_jobs_type (tenant_id, job_type, direction)
    )
  `).execute(database)

  await sql.raw(`
    CREATE TABLE IF NOT EXISTS tally_sync_items (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      uuid CHAR(8) NOT NULL UNIQUE,
      job_id INT NOT NULL,
      module_key VARCHAR(120) NOT NULL,
      record_id VARCHAR(120) NULL,
      record_uuid VARCHAR(80) NULL,
      record_label VARCHAR(240) NULL,
      tally_guid VARCHAR(160) NULL,
      status VARCHAR(40) NOT NULL DEFAULT 'pending',
      error_message TEXT NULL,
      payload JSON NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_tally_items_job (job_id, status, id),
      INDEX idx_tally_items_record (module_key, record_uuid)
    )
  `).execute(database)

  await sql.raw(`
    CREATE TABLE IF NOT EXISTS tally_sync_links (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      uuid CHAR(8) NOT NULL UNIQUE,
      tenant_id INT NOT NULL,
      company_id INT NULL,
      module_key VARCHAR(80) NOT NULL,
      record_type VARCHAR(40) NOT NULL DEFAULT 'master',
      record_id VARCHAR(120) NULL,
      record_uuid VARCHAR(80) NOT NULL,
      record_label VARCHAR(240) NULL,
      classification VARCHAR(80) NULL,
      tally_name VARCHAR(240) NULL,
      tally_guid VARCHAR(160) NULL,
      status VARCHAR(40) NOT NULL DEFAULT 'not-synced',
      last_synced_at DATETIME NULL,
      last_error TEXT NULL,
      payload JSON NULL,
      updated_by VARCHAR(191) NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uq_tally_sync_links_record (tenant_id, company_id, module_key, record_uuid),
      INDEX idx_tally_sync_links_status (tenant_id, module_key, status, updated_at)
    )
  `).execute(database)
}
