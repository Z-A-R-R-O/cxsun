import mysql from 'mysql2'
import { createConnection } from 'mysql2/promise'
import { Kysely, MysqlDialect, sql } from 'kysely'
import type { TenantDatabaseSchema } from './tenant-database.schema.js'
import type { Tenant } from '../../modules/tenant/domain/tenant.types.js'

type TenantDatabase = Kysely<TenantDatabaseSchema>

const connections = new Map<string, TenantDatabase>()

export function getTenantDatabase(tenant: Tenant): TenantDatabase {
  const existing = connections.get(tenant.slug)

  if (existing) {
    return existing
  }

  const database = new Kysely<TenantDatabaseSchema>({
    dialect: new MysqlDialect({
      pool: mysql.createPool({
        host: tenant.db_host,
        port: tenant.db_port,
        user: tenant.db_user,
        password: getTenantDatabasePassword(tenant.db_secret_ref),
        database: tenant.db_name,
        connectionLimit: Number(process.env.TENANT_DB_CONNECTION_LIMIT ?? 5),
        connectTimeout: Number(process.env.TENANT_DB_CONNECT_TIMEOUT_MS ?? 2_000),
      }),
    }),
  })

  connections.set(tenant.slug, database)
  return database
}

export async function provisionTenantDatabase(tenant: Tenant): Promise<void> {
  const rootConnection = await createConnection({
    host: tenant.db_host,
    port: tenant.db_port,
    user: tenant.db_user,
    password: getTenantDatabasePassword(tenant.db_secret_ref),
    multipleStatements: false,
    connectTimeout: Number(process.env.TENANT_DB_CONNECT_TIMEOUT_MS ?? 2_000),
  })

  try {
    await rootConnection.query(`CREATE DATABASE IF NOT EXISTS \`${tenant.db_name}\``)
  } finally {
    await rootConnection.end()
  }

  const database = getTenantDatabase(tenant)

  await database.schema
    .createTable('companies')
    .ifNotExists()
    .addColumn('id', 'integer', (col) => col.primaryKey().autoIncrement())
    .addColumn('name', 'varchar(191)', (col) => col.notNull())
    .addColumn('status', 'varchar(32)', (col) => col.notNull().defaultTo('active'))
    .addColumn('settings', 'json', (col) => col.notNull())
    .addColumn('features', 'json', (col) => col.notNull())
    .addColumn('created_at', 'datetime', (col) => col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
    .addColumn('updated_at', 'datetime', (col) => col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
    .addColumn('deleted_at', 'datetime')
    .execute()

  await sql`ALTER TABLE companies MODIFY deleted_at DATETIME NULL`.execute(database)

  await database.schema
    .createTable('rbac_roles')
    .ifNotExists()
    .addColumn('id', 'integer', (col) => col.primaryKey().autoIncrement())
    .addColumn('code', 'varchar(64)', (col) => col.notNull().unique())
    .addColumn('name', 'varchar(191)', (col) => col.notNull())
    .addColumn('settings', 'json', (col) => col.notNull())
    .addColumn('created_at', 'datetime', (col) => col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
    .addColumn('updated_at', 'datetime', (col) => col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
    .execute()

  await database.schema
    .createTable('rbac_policies')
    .ifNotExists()
    .addColumn('id', 'integer', (col) => col.primaryKey().autoIncrement())
    .addColumn('code', 'varchar(128)', (col) => col.notNull().unique())
    .addColumn('name', 'varchar(191)', (col) => col.notNull())
    .addColumn('description', 'text', (col) => col.notNull())
    .addColumn('created_at', 'datetime', (col) => col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
    .execute()

  await database.schema
    .createTable('rbac_role_policies')
    .ifNotExists()
    .addColumn('id', 'integer', (col) => col.primaryKey().autoIncrement())
    .addColumn('role_code', 'varchar(64)', (col) => col.notNull())
    .addColumn('policy_code', 'varchar(128)', (col) => col.notNull())
    .addColumn('created_at', 'datetime', (col) => col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
    .execute()

  await seedTenantDatabase(database, tenant)
}

function getTenantDatabasePassword(secretRef: string) {
  return process.env[secretRef] ?? process.env.MARIADB_ROOT_PASSWORD ?? 'Computer.1'
}

async function seedTenantDatabase(database: TenantDatabase, tenant: Tenant) {
  const company = await database
    .selectFrom('companies')
    .select('id')
    .executeTakeFirst()

  if (!company) {
    await database
      .insertInto('companies')
      .values({
        name: `${tenant.name} Company`,
        status: 'active',
        settings: JSON.stringify({ timezone: 'Asia/Calcutta', currency: 'INR' }),
        features: JSON.stringify(['company.manage']),
      })
      .execute()
  }

  const ownerRole = await database
    .selectFrom('rbac_roles')
    .select('id')
    .where('code', '=', 'owner')
    .executeTakeFirst()

  if (!ownerRole) {
    await database
      .insertInto('rbac_roles')
      .values({
        code: 'owner',
        name: 'Owner',
        settings: JSON.stringify({ system: true }),
      })
      .execute()
  }

  const policy = await database
    .selectFrom('rbac_policies')
    .select('id')
    .where('code', '=', 'company.manage')
    .executeTakeFirst()

  if (!policy) {
    await database
      .insertInto('rbac_policies')
      .values([
        {
          code: 'company.manage',
          name: 'Manage companies',
          description: 'Allows managing companies inside this tenant database.',
        },
        {
          code: 'rbac.manage',
          name: 'Manage RBAC',
          description: 'Allows managing tenant-local roles and policy assignments.',
        },
      ])
      .execute()
  }

  const rolePolicy = await database
    .selectFrom('rbac_role_policies')
    .select('id')
    .where('role_code', '=', 'owner')
    .where('policy_code', '=', 'company.manage')
    .executeTakeFirst()

  if (!rolePolicy) {
    await database
      .insertInto('rbac_role_policies')
      .values([
        { role_code: 'owner', policy_code: 'company.manage' },
        { role_code: 'owner', policy_code: 'rbac.manage' },
      ])
      .execute()
  }
}
