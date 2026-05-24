import { sql } from 'kysely'
import { addMasterColumnIfMissing, nowIso, type PlatformDatabaseModule, type PlatformDatabase } from '../../../infrastructure/database/database-module.js'
import { dbConfig } from '../../../framework/config/index.js'

export const tenantDatabaseModule: PlatformDatabaseModule = {
  name: 'tenant',
  async migrate(database) {
    await sql.raw(`
      CREATE TABLE IF NOT EXISTS tenants (
        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        code INT NOT NULL UNIQUE,
        slug VARCHAR(80) NOT NULL UNIQUE,
        name VARCHAR(191) NOT NULL,
        status VARCHAR(32) NOT NULL DEFAULT 'active',
        db_type VARCHAR(32) NOT NULL DEFAULT 'mariadb',
        db_host VARCHAR(191) NOT NULL,
        db_port INT NOT NULL,
        db_name VARCHAR(191) NOT NULL,
        db_user VARCHAR(191) NOT NULL,
        db_secret_ref VARCHAR(191) NOT NULL,
        company_count INT NOT NULL DEFAULT 0,
        active_company_count INT NOT NULL DEFAULT 0,
        company_concept_count INT NOT NULL DEFAULT 0,
        payload_settings LONGTEXT NOT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        deleted_at DATETIME NULL
      )
    `).execute(database)

    await addMasterColumnIfMissing(database, 'tenants', 'company_count', 'INT NOT NULL DEFAULT 0')
    await addMasterColumnIfMissing(database, 'tenants', 'active_company_count', 'INT NOT NULL DEFAULT 0')
    await addMasterColumnIfMissing(database, 'tenants', 'company_concept_count', 'INT NOT NULL DEFAULT 0')
  },
  async seed(database) {
    for (const tenant of [
      { code: 100, slug: 'demo_app', name: 'Demo-app', dbName: 'demo_db' },
    ]) {
      await ensureTenant(database, tenant)
    }

    for (const slug of ['aaran', 'sathasivam', 'sampath', 'sathish', 'sundar']) {
      await retireLegacyTenant(database, slug)
    }
  },
}

async function ensureTenant(database: PlatformDatabase, data: { code: number; slug: string; name: string; dbName?: string }) {
  const existing = await database
    .selectFrom('tenants')
    .select('id')
    .where((eb) => eb.or([
      eb('slug', '=', data.slug),
      eb('code', '=', data.code),
    ]))
    .executeTakeFirst()

  const row = {
    code: data.code,
    slug: data.slug,
    name: data.name,
    status: 'active',
    db_type: 'mariadb',
    db_host: dbConfig.tenant.defaults.host,
    db_port: dbConfig.tenant.defaults.port,
    db_name: data.dbName ?? `${data.slug}_db`,
    db_user: dbConfig.tenant.defaults.user,
    db_secret_ref: dbConfig.tenant.defaults.secretRef,
    payload_settings: JSON.stringify({ ui: { density: 'comfortable' }, features: ['company.manage'] }),
    updated_at: nowIso(),
  }

  if (existing) {
    await database.updateTable('tenants').set(row).where('id', '=', existing.id).execute()
    return
  }

  await database.insertInto('tenants').values({
    ...row,
    company_count: 0,
    active_company_count: 0,
    company_concept_count: 0,
  }).execute()
}

async function retireLegacyTenant(database: PlatformDatabase, slug: string) {
  const existing = await database
    .selectFrom('tenants')
    .select('id')
    .where('slug', '=', slug)
    .executeTakeFirst()

  if (!existing) {
    return
  }

  await database
    .updateTable('tenants')
    .set({ status: 'suspend', deleted_at: nowIso(), updated_at: nowIso() })
    .where('id', '=', existing.id)
    .execute()
}
