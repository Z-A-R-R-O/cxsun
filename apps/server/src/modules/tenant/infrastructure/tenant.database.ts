import { sql } from 'kysely'
import { addSqliteColumnIfMissing, nowIso, type PlatformDatabaseModule, type PlatformDatabase } from '../../../infrastructure/database/database-module.js'

export const tenantDatabaseModule: PlatformDatabaseModule = {
  name: 'tenant',
  async migrate(database) {
    await database.schema
      .createTable('tenants')
      .ifNotExists()
      .addColumn('id', 'integer', (col) => col.primaryKey().autoIncrement())
      .addColumn('code', 'integer', (col) => col.notNull().unique())
      .addColumn('slug', 'text', (col) => col.notNull().unique())
      .addColumn('name', 'text', (col) => col.notNull())
      .addColumn('status', 'text', (col) => col.notNull().defaultTo('active'))
      .addColumn('db_type', 'text', (col) => col.notNull().defaultTo('mariadb'))
      .addColumn('db_host', 'text', (col) => col.notNull())
      .addColumn('db_port', 'integer', (col) => col.notNull())
      .addColumn('db_name', 'text', (col) => col.notNull())
      .addColumn('db_user', 'text', (col) => col.notNull())
      .addColumn('db_secret_ref', 'text', (col) => col.notNull())
      .addColumn('company_count', 'integer', (col) => col.notNull().defaultTo(0))
      .addColumn('active_company_count', 'integer', (col) => col.notNull().defaultTo(0))
      .addColumn('company_concept_count', 'integer', (col) => col.notNull().defaultTo(0))
      .addColumn('payload_settings', 'text', (col) => col.notNull())
      .addColumn('created_at', 'text', (col) => col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
      .addColumn('updated_at', 'text', (col) => col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
      .addColumn('deleted_at', 'text')
      .execute()

    await addSqliteColumnIfMissing(database, 'tenants', 'company_count', 'integer NOT NULL DEFAULT 0')
    await addSqliteColumnIfMissing(database, 'tenants', 'active_company_count', 'integer NOT NULL DEFAULT 0')
    await addSqliteColumnIfMissing(database, 'tenants', 'company_concept_count', 'integer NOT NULL DEFAULT 0')
  },
  async seed(database) {
    for (const tenant of [
      { code: 100, slug: 'sundar', name: 'Sundar' },
      { code: 101, slug: 'sathish', name: 'Sathish' },
      { code: 102, slug: 'sampath', name: 'Sampath' },
      { code: 103, slug: 'sathasivam', name: 'Sathasivam' },
    ]) {
      await ensureTenant(database, tenant)
    }
  },
}

async function ensureTenant(database: PlatformDatabase, data: { code: number; slug: string; name: string }) {
  const existing = await database
    .selectFrom('tenants')
    .select('id')
    .where((eb) => eb.or([
      eb('slug', '=', data.slug),
      eb('code', '=', data.code),
    ]))
    .executeTakeFirst()

  const row = {
    ...data,
    status: 'active',
    db_type: 'mariadb',
    db_host: process.env.MARIADB_HOST ?? 'localhost',
    db_port: Number(process.env.MARIADB_PORT ?? 3306),
    db_name: `${data.slug}_db`,
    db_user: process.env.MARIADB_USER ?? 'root',
    db_secret_ref: 'MARIADB_ROOT_PASSWORD',
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
