import { sql } from 'kysely'
import type { PlatformDatabaseModule } from '../../../infrastructure/database/database-module.js'

export const tenantDomainDatabaseModule: PlatformDatabaseModule = {
  name: 'tenant-domain',
  async migrate(database) {
    await sql.raw(`
      CREATE TABLE IF NOT EXISTS tenant_domains (
        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        tenant_id INT NOT NULL,
        domain VARCHAR(191) NOT NULL UNIQUE,
        label VARCHAR(191) NOT NULL,
        is_primary TINYINT(1) NOT NULL DEFAULT 0,
        status VARCHAR(32) NOT NULL DEFAULT 'active',
        settings LONGTEXT NOT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        deleted_at DATETIME NULL,
        INDEX idx_tenant_domains_tenant (tenant_id)
      )
    `).execute(database)
  },
  async seed(database) {
    await sql.raw(`
      UPDATE tenant_domains
      INNER JOIN tenants ON tenants.id = tenant_domains.tenant_id
      SET tenant_domains.status = 'suspend',
          tenant_domains.deleted_at = CURRENT_TIMESTAMP,
          tenant_domains.updated_at = CURRENT_TIMESTAMP
      WHERE tenants.status <> 'active'
         OR tenants.deleted_at IS NOT NULL
    `).execute(database)
  },
}
