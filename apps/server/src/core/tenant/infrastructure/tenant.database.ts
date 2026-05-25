import { sql } from 'kysely'
import { nowIso, type PlatformDatabaseModule, type PlatformDatabase } from '../../../infrastructure/database/database-module.js'

export const tenantDatabaseModule: PlatformDatabaseModule = {
  name: 'tenant',
  async migrate(database) {
    await sql.raw(`
      CREATE TABLE IF NOT EXISTS tenants (
        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        code INT NOT NULL UNIQUE,
        corporate_id VARCHAR(80) NULL UNIQUE,
        mobile VARCHAR(32) NULL UNIQUE,
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
  },
  async seed(database) {
    for (const slug of ['demo_app', 'aaran', 'sathasivam', 'sampath', 'sathish', 'sundar']) {
      await retireLegacyTenant(database, slug)
    }

    await seedTenantLoginIdentifiers(database)
  },
}

async function seedTenantLoginIdentifiers(database: PlatformDatabase) {
  const tenants = await database
    .selectFrom('tenants')
    .select(['id', 'code', 'slug', 'corporate_id', 'mobile'])
    .where('deleted_at', 'is', null)
    .orderBy('code', 'asc')
    .execute()

  for (const tenant of tenants) {
    const isDefaultTenant = tenant.code === tenants[0]?.code
    const corporateId = tenant.corporate_id?.trim() || (isDefaultTenant ? 'CODEXSUN' : tenant.slug.toUpperCase())
    const mobile = tenant.mobile?.trim() || (isDefaultTenant ? '9655227738' : null)

    await database
      .updateTable('tenants')
      .set({
        corporate_id: corporateId,
        mobile,
        updated_at: nowIso(),
      })
      .where('id', '=', tenant.id)
      .execute()
  }
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
    .set({ status: 'suspend', corporate_id: null, mobile: null, deleted_at: nowIso(), updated_at: nowIso() })
    .where('id', '=', existing.id)
    .execute()
}
