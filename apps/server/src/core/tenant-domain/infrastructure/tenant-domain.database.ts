import { sql } from 'kysely'
import { addMasterColumnIfMissing, nowIso, type PlatformDatabase, type PlatformDatabaseModule } from '../../../infrastructure/database/database-module.js'

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

    await addMasterColumnIfMissing(database, 'tenant_domains', 'label', "VARCHAR(191) NOT NULL DEFAULT ''")
    await addMasterColumnIfMissing(database, 'tenant_domains', 'is_primary', 'TINYINT(1) NOT NULL DEFAULT 0')
    await addMasterColumnIfMissing(database, 'tenant_domains', 'settings', 'LONGTEXT NULL')
    await addMasterColumnIfMissing(database, 'tenant_domains', 'deleted_at', 'DATETIME NULL')
  },
  async seed(database) {
    for (const item of [
      { tenantSlug: 'demo_app', domain: 'localhost', label: 'Demo-app local development', isPrimary: true },
    ]) {
      const tenant = await database.selectFrom('tenants').select('id').where('slug', '=', item.tenantSlug).executeTakeFirst()
      if (!tenant) continue
      await ensureTenantDomain(database, {
        tenantId: tenant.id,
        domain: item.domain,
        label: item.label,
        isPrimary: item.isPrimary,
      })
    }
  },
}

async function ensureTenantDomain(
  database: PlatformDatabase,
  data: { tenantId: number; domain: string; label: string; isPrimary: boolean },
) {
  const domain = normalizeDomain(data.domain)
  const existing = await database.selectFrom('tenant_domains').select('id').where('domain', '=', domain).executeTakeFirst()
  const row = {
    tenant_id: data.tenantId,
    domain,
    label: data.label,
    is_primary: data.isPrimary ? 1 : 0,
    status: 'active',
    settings: JSON.stringify({ landing: { mode: 'tenant' } }),
    deleted_at: null,
    updated_at: nowIso(),
  }

  if (existing) {
    await database.updateTable('tenant_domains').set(row).where('id', '=', existing.id).execute()
    return
  }

  await database.insertInto('tenant_domains').values(row).execute()
}

function normalizeDomain(value: string) {
  return value.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '').replace(/:\d+$/, '')
}
