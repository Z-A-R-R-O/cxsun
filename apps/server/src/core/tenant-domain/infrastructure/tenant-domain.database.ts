import { sql } from 'kysely'
import { nowIso, type PlatformDatabaseModule, type PlatformDatabase } from '../../../infrastructure/database/database-module.js'
import { liveClientScopes, type LiveClientScope } from '../../tenant/live-client-scope.js'

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
    const liveDomains = liveClientScopes.flatMap((client) => client.domains)
    const liveSlugs = liveClientScopes.map((client) => client.slug)

    await sql.raw(`
      UPDATE tenant_domains
      INNER JOIN tenants ON tenants.id = tenant_domains.tenant_id
      SET tenant_domains.status = 'suspend',
          tenant_domains.deleted_at = CURRENT_TIMESTAMP,
          tenant_domains.updated_at = CURRENT_TIMESTAMP
      WHERE tenants.status <> 'active'
         OR tenants.deleted_at IS NOT NULL
    `).execute(database)

    if (liveDomains.length > 0) {
      await database
        .updateTable('tenant_domains')
        .where('tenant_id', 'in',
          database.selectFrom('tenants').select('id').where('slug', 'in', liveSlugs),
        )
        .set({
          status: 'suspend',
          deleted_at: nowIso(),
          updated_at: nowIso(),
        })
        .where('domain', 'not in', liveDomains)
        .where((eb) => eb.or([
          eb('label', 'like', '% primary domain'),
          eb('label', 'like', '% alias domain'),
        ]))
        .execute()
    }

    for (const client of liveClientScopes) {
      await ensureLiveClientDomains(database, client)
    }
  },
}

async function ensureLiveClientDomains(database: PlatformDatabase, client: LiveClientScope) {
  const tenant = await database
    .selectFrom('tenants')
    .select(['id'])
    .where('slug', '=', client.slug)
    .where('deleted_at', 'is', null)
    .executeTakeFirst()

  if (!tenant) {
    return
  }

  for (const [index, domain] of client.domains.entries()) {
    const existing = await database
      .selectFrom('tenant_domains')
      .select('id')
      .where('domain', '=', domain)
      .executeTakeFirst()

    const row = {
      tenant_id: tenant.id,
      domain,
      label: `${client.name} ${index === 0 ? 'primary' : 'alias'} domain`,
      is_primary: index === 0 ? 1 : 0,
      status: 'active',
      settings: JSON.stringify({
        landing: { mode: 'tenant', app: client.landingApp },
        industry: client.industry,
        companies: client.companies,
      }),
      deleted_at: null,
      updated_at: nowIso(),
    }

    if (existing) {
      await database
        .updateTable('tenant_domains')
        .set(row)
        .where('id', '=', existing.id)
        .execute()
      continue
    }

    await database.insertInto('tenant_domains').values(row).execute()
  }
}
