import { sql } from 'kysely'
import { addSqliteColumnIfMissing, nowIso, type PlatformDatabase, type PlatformDatabaseModule } from '../../../infrastructure/database/database-module.js'

export const tenantDomainDatabaseModule: PlatformDatabaseModule = {
  name: 'tenant-domain',
  async migrate(database) {
    await database.schema
      .createTable('tenant_domains')
      .ifNotExists()
      .addColumn('id', 'integer', (col) => col.primaryKey().autoIncrement())
      .addColumn('tenant_id', 'integer', (col) => col.notNull())
      .addColumn('domain', 'text', (col) => col.notNull().unique())
      .addColumn('label', 'text', (col) => col.notNull())
      .addColumn('is_primary', 'integer', (col) => col.notNull().defaultTo(0))
      .addColumn('status', 'text', (col) => col.notNull().defaultTo('active'))
      .addColumn('settings', 'text', (col) => col.notNull())
      .addColumn('created_at', 'text', (col) => col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
      .addColumn('updated_at', 'text', (col) => col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
      .addColumn('deleted_at', 'text')
      .execute()

    await addSqliteColumnIfMissing(database, 'tenant_domains', 'label', "text NOT NULL DEFAULT ''")
    await addSqliteColumnIfMissing(database, 'tenant_domains', 'is_primary', 'integer NOT NULL DEFAULT 0')
    await addSqliteColumnIfMissing(database, 'tenant_domains', 'settings', "text NOT NULL DEFAULT '{}'")
    await addSqliteColumnIfMissing(database, 'tenant_domains', 'deleted_at', 'text')
  },
  async seed(database) {
    for (const item of [
      { tenantSlug: 'sundar', domain: 'localhost', label: 'Local development', isPrimary: true },
      { tenantSlug: 'sundar', domain: '127.0.0.1', label: 'Local loopback', isPrimary: false },
      { tenantSlug: 'sundar', domain: 'codexsun.local', label: 'Codexsun local', isPrimary: false },
      { tenantSlug: 'sathish', domain: 'sathish.local', label: 'Sathish local', isPrimary: true },
      { tenantSlug: 'sampath', domain: 'sampath.local', label: 'Sampath local', isPrimary: true },
      { tenantSlug: 'sathasivam', domain: 'sathasivam.local', label: 'Sathasivam local', isPrimary: true },
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
