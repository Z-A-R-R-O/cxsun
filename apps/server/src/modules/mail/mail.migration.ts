import { sql } from 'kysely'
import type { TenantDatabase } from '../../infrastructure/tenant-database/tenant-database.types.js'

export async function migrateMailTables(database: TenantDatabase) {
  await sql.raw(`
    CREATE TABLE IF NOT EXISTS mail_settings (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      uuid CHAR(8) NOT NULL UNIQUE,
      tenant_id INT NOT NULL,
      company_id INT NULL,
      provider VARCHAR(80) NOT NULL DEFAULT 'smtp',
      host VARCHAR(191) NOT NULL DEFAULT '',
      port INT NOT NULL DEFAULT 587,
      secure TINYINT(1) NOT NULL DEFAULT 0,
      username VARCHAR(191) NOT NULL DEFAULT '',
      password_secret LONGTEXT NOT NULL,
      from_email VARCHAR(191) NOT NULL DEFAULT '',
      from_name VARCHAR(191) NULL,
      reply_to VARCHAR(191) NULL,
      enabled TINYINT(1) NOT NULL DEFAULT 0,
      updated_by VARCHAR(191) NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uq_mail_settings_company (company_id)
    )
  `).execute(database)

  await sql.raw(`
    CREATE TABLE IF NOT EXISTS mail_messages (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      uuid CHAR(8) NOT NULL UNIQUE,
      tenant_id INT NOT NULL,
      company_id INT NULL,
      message_no VARCHAR(80) NOT NULL,
      direction VARCHAR(32) NOT NULL DEFAULT 'outbound',
      status VARCHAR(32) NOT NULL DEFAULT 'draft',
      from_email VARCHAR(191) NOT NULL,
      from_name VARCHAR(191) NULL,
      reply_to VARCHAR(191) NULL,
      to_json LONGTEXT NOT NULL,
      cc_json LONGTEXT NOT NULL,
      bcc_json LONGTEXT NOT NULL,
      subject VARCHAR(500) NOT NULL,
      body_text LONGTEXT NULL,
      body_html LONGTEXT NULL,
      provider_message_id VARCHAR(191) NULL,
      queued_at DATETIME NULL,
      sent_at DATETIME NULL,
      failed_at DATETIME NULL,
      error LONGTEXT NULL,
      created_by VARCHAR(191) NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      deleted_at DATETIME NULL,
      INDEX idx_mail_messages_status (tenant_id, status, created_at),
      INDEX idx_mail_messages_message_no (tenant_id, message_no)
    )
  `).execute(database)

  await sql.raw(`
    CREATE TABLE IF NOT EXISTS mail_attachments (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      uuid CHAR(8) NOT NULL UNIQUE,
      mail_message_id INT NOT NULL,
      file_name VARCHAR(255) NOT NULL,
      mime_type VARCHAR(120) NOT NULL DEFAULT 'application/octet-stream',
      size_bytes INT NOT NULL DEFAULT 0,
      content_base64 LONGTEXT NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_mail_attachments_message (mail_message_id)
    )
  `).execute(database)

  await sql.raw(`
    CREATE TABLE IF NOT EXISTS mail_events (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      uuid CHAR(8) NOT NULL UNIQUE,
      mail_message_id INT NOT NULL,
      event_type VARCHAR(80) NOT NULL,
      actor_email VARCHAR(191) NOT NULL,
      message VARCHAR(500) NOT NULL,
      payload LONGTEXT NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_mail_events_message (mail_message_id)
    )
  `).execute(database)
}
