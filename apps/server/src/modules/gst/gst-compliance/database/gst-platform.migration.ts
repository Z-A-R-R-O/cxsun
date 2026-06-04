import { sql } from 'kysely'
import type { PlatformDatabaseModule } from '../../../../infrastructure/database/database-module.js'

export const gstPlatformDatabaseModule: PlatformDatabaseModule = {
  name: 'gst-platform',
  async migrate(database) {
    await sql`
      CREATE TABLE IF NOT EXISTS gst_provider_global_settings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        uuid VARCHAR(64) NOT NULL,
        provider VARCHAR(40) NOT NULL DEFAULT 'whitebooks',
        environment VARCHAR(24) NOT NULL DEFAULT 'production',
        purpose VARCHAR(32) NOT NULL DEFAULT 'einvoice_eway',
        base_url VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        client_id VARCHAR(255) NOT NULL,
        client_secret TEXT NOT NULL,
        ip_address VARCHAR(64) NOT NULL DEFAULT '0.0.0.0',
        is_enabled TINYINT(1) NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uq_gst_provider_global_env (provider, environment)
      )
    `.execute(database)

    await sql`ALTER TABLE gst_provider_global_settings ADD COLUMN IF NOT EXISTS purpose VARCHAR(32) NOT NULL DEFAULT 'einvoice_eway' AFTER environment`.execute(database)
    await sql`ALTER TABLE gst_provider_global_settings DROP INDEX IF EXISTS uq_gst_provider_global_env`.execute(database)
    await sql`ALTER TABLE gst_provider_global_settings ADD UNIQUE KEY IF NOT EXISTS uq_gst_provider_global_env_purpose (provider, environment, purpose)`.execute(database)
  },
}
