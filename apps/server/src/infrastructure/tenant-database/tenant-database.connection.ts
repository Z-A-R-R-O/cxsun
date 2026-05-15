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
    .addColumn('tenant_id', 'integer', (col) => col.notNull())
    .addColumn('industry_id', 'integer', (col) => col.notNull())
    .addColumn('code', 'varchar(64)', (col) => col.notNull())
    .addColumn('name', 'varchar(191)', (col) => col.notNull())
    .addColumn('legal_name', 'varchar(220)')
    .addColumn('tagline', 'varchar(220)')
    .addColumn('short_about', 'varchar(500)')
    .addColumn('gstin_uin', 'varchar(30)')
    .addColumn('pan', 'varchar(30)')
    .addColumn('date_of_incorporation', 'date')
    .addColumn('msme_no', 'varchar(80)')
    .addColumn('msme_category', 'varchar(80)')
    .addColumn('tan', 'varchar(30)')
    .addColumn('tds_available', 'boolean', (col) => col.notNull().defaultTo(false))
    .addColumn('tds_section', 'varchar(80)')
    .addColumn('tds_rate_percent', 'double precision')
    .addColumn('tcs_available', 'boolean', (col) => col.notNull().defaultTo(false))
    .addColumn('tcs_section', 'varchar(80)')
    .addColumn('tcs_rate_percent', 'double precision')
    .addColumn('website', 'varchar(240)')
    .addColumn('description', 'text')
    .addColumn('primary_email', 'varchar(180)')
    .addColumn('primary_phone', 'varchar(80)')
    .addColumn('is_primary', 'boolean', (col) => col.notNull().defaultTo(false))
    .addColumn('is_active', 'boolean', (col) => col.notNull().defaultTo(true))
    .addColumn('status', 'varchar(32)', (col) => col.notNull().defaultTo('active'))
    .addColumn('settings', 'json', (col) => col.notNull())
    .addColumn('features', 'json', (col) => col.notNull())
    .addColumn('created_at', 'datetime', (col) => col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
    .addColumn('updated_at', 'datetime', (col) => col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
    .addColumn('deleted_at', 'datetime')
    .execute()

  await ensureCompanyColumns(database)
  await createCompanyChildTables(database)

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
  const years = await seedAccountingYears(database)
  const company = await database
    .selectFrom('companies')
    .select(['id', 'tenant_id', 'industry_id'])
    .executeTakeFirst()

  if (!company) {
    const result = await database
      .insertInto('companies')
      .values({
        tenant_id: tenant.id,
        industry_id: tenant.industry_id ?? 0,
        code: normalizeTenantCompanyCode(tenant),
        name: `${tenant.name} Company`,
        legal_name: `${tenant.name} Private Limited`,
        tagline: 'Connected business workspace',
        short_about: `${tenant.name} default operating company.`,
        gstin_uin: null,
        pan: null,
        date_of_incorporation: null,
        msme_no: null,
        msme_category: null,
        tan: null,
        tds_available: false,
        tds_section: null,
        tds_rate_percent: null,
        tcs_available: false,
        tcs_section: null,
        tcs_rate_percent: null,
        website: null,
        description: `Default seeded company for ${tenant.name}.`,
        primary_email: `hello@${tenant.slug}.local`,
        primary_phone: null,
        is_primary: true,
        is_active: true,
        status: 'active',
        settings: JSON.stringify({ timezone: 'Asia/Calcutta', currency: 'INR' }),
        features: JSON.stringify(['company.manage']),
      })
      .executeTakeFirst()

    const companyId = Number(result.insertId)
    await seedCompanyChildren(database, companyId)
    await ensureDefaultCompany(database, tenant, companyId, years.currentYearId)
  } else {
    await database
      .updateTable('companies')
      .set({
        tenant_id: company.tenant_id || tenant.id,
        industry_id: company.industry_id || tenant.industry_id || 0,
        code: normalizeTenantCompanyCode(tenant),
      })
      .where('id', '=', company.id)
      .execute()

    await seedCompanyChildren(database, company.id)
    await ensureDefaultCompany(database, tenant, company.id, years.currentYearId)
  }

  for (const role of [
    { code: 'owner', name: 'Owner' },
    { code: 'super-admin', name: 'Super admin' },
    { code: 'tenant-admin', name: 'Tenant admin' },
    { code: 'tenant-user', name: 'Tenant user' },
  ]) {
    await ensureRole(database, role)
  }

  for (const policy of [
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
  ]) {
    await ensurePolicy(database, policy)
  }

  for (const roleCode of ['owner', 'super-admin', 'tenant-admin', 'tenant-user']) {
    await ensureRolePolicy(database, roleCode, 'company.manage')
  }

  for (const roleCode of ['owner', 'super-admin', 'tenant-admin']) {
    await ensureRolePolicy(database, roleCode, 'rbac.manage')
  }
}

async function ensureCompanyColumns(database: TenantDatabase) {
  await addColumnIfMissing(database, 'companies', 'tenant_id', 'INT NOT NULL DEFAULT 0')
  await addColumnIfMissing(database, 'companies', 'industry_id', 'INT NOT NULL DEFAULT 0')
  await addColumnIfMissing(database, 'companies', 'code', 'VARCHAR(64) NULL')
  await addColumnIfMissing(database, 'companies', 'legal_name', 'VARCHAR(220) NULL')
  await addColumnIfMissing(database, 'companies', 'tagline', 'VARCHAR(220) NULL')
  await addColumnIfMissing(database, 'companies', 'short_about', 'VARCHAR(500) NULL')
  await addColumnIfMissing(database, 'companies', 'gstin_uin', 'VARCHAR(30) NULL')
  await addColumnIfMissing(database, 'companies', 'pan', 'VARCHAR(30) NULL')
  await addColumnIfMissing(database, 'companies', 'date_of_incorporation', 'DATE NULL')
  await addColumnIfMissing(database, 'companies', 'msme_no', 'VARCHAR(80) NULL')
  await addColumnIfMissing(database, 'companies', 'msme_category', 'VARCHAR(80) NULL')
  await addColumnIfMissing(database, 'companies', 'tan', 'VARCHAR(30) NULL')
  await addColumnIfMissing(database, 'companies', 'tds_available', 'TINYINT(1) NOT NULL DEFAULT 0')
  await addColumnIfMissing(database, 'companies', 'tds_section', 'VARCHAR(80) NULL')
  await addColumnIfMissing(database, 'companies', 'tds_rate_percent', 'DOUBLE NULL')
  await addColumnIfMissing(database, 'companies', 'tcs_available', 'TINYINT(1) NOT NULL DEFAULT 0')
  await addColumnIfMissing(database, 'companies', 'tcs_section', 'VARCHAR(80) NULL')
  await addColumnIfMissing(database, 'companies', 'tcs_rate_percent', 'DOUBLE NULL')
  await addColumnIfMissing(database, 'companies', 'website', 'VARCHAR(240) NULL')
  await addColumnIfMissing(database, 'companies', 'description', 'TEXT NULL')
  await addColumnIfMissing(database, 'companies', 'primary_email', 'VARCHAR(180) NULL')
  await addColumnIfMissing(database, 'companies', 'primary_phone', 'VARCHAR(80) NULL')
  await addColumnIfMissing(database, 'companies', 'is_primary', 'TINYINT(1) NOT NULL DEFAULT 0')
  await addColumnIfMissing(database, 'companies', 'is_active', 'TINYINT(1) NOT NULL DEFAULT 1')
  await addColumnIfMissing(database, 'companies', 'status', "VARCHAR(32) NOT NULL DEFAULT 'active'")
  await addColumnIfMissing(database, 'companies', 'settings', 'JSON NULL')
  await addColumnIfMissing(database, 'companies', 'features', 'JSON NULL')
  await sql`ALTER TABLE companies MODIFY deleted_at DATETIME NULL`.execute(database)
  await sql`UPDATE companies SET code = CONCAT('COMP_', id) WHERE code IS NULL OR code = ''`.execute(database)
  await sql`UPDATE companies SET tenant_id = ${0} WHERE tenant_id IS NULL`.execute(database)
  await sql`UPDATE companies SET industry_id = ${0} WHERE industry_id IS NULL`.execute(database)
}

async function createCompanyChildTables(database: TenantDatabase) {
  await database.schema
    .createTable('accounting_years')
    .ifNotExists()
    .addColumn('id', 'integer', (col) => col.primaryKey().autoIncrement())
    .addColumn('name', 'varchar(80)', (col) => col.notNull())
    .addColumn('start_date', 'date', (col) => col.notNull())
    .addColumn('end_date', 'date', (col) => col.notNull())
    .addColumn('books_start', 'date', (col) => col.notNull())
    .addColumn('is_active', 'boolean', (col) => col.notNull().defaultTo(true))
    .addColumn('created_at', 'datetime', (col) => col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
    .addColumn('updated_at', 'datetime', (col) => col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
    .addColumn('deleted_at', 'datetime')
    .execute()

  await database.schema
    .createTable('default_companies')
    .ifNotExists()
    .addColumn('id', 'integer', (col) => col.primaryKey().autoIncrement())
    .addColumn('tenant_id', 'integer', (col) => col.notNull())
    .addColumn('industry_id', 'integer', (col) => col.notNull())
    .addColumn('company_id', 'integer', (col) => col.notNull())
    .addColumn('accounting_year_id', 'integer', (col) => col.notNull())
    .addColumn('is_active', 'boolean', (col) => col.notNull().defaultTo(true))
    .addColumn('created_at', 'datetime', (col) => col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
    .addColumn('updated_at', 'datetime', (col) => col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
    .execute()

  await database.schema
    .createTable('company_logos')
    .ifNotExists()
    .addColumn('id', 'integer', (col) => col.primaryKey().autoIncrement())
    .addColumn('company_id', 'integer', (col) => col.notNull())
    .addColumn('logo_url', 'varchar(500)', (col) => col.notNull())
    .addColumn('logo_type', 'varchar(80)', (col) => col.notNull())
    .addColumn('is_active', 'boolean', (col) => col.notNull().defaultTo(true))
    .addColumn('created_at', 'datetime', (col) => col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
    .addColumn('updated_at', 'datetime', (col) => col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
    .execute()

  await database.schema
    .createTable('address_book')
    .ifNotExists()
    .addColumn('id', 'integer', (col) => col.primaryKey().autoIncrement())
    .addColumn('owner_type', 'varchar(80)', (col) => col.notNull())
    .addColumn('owner_id', 'integer', (col) => col.notNull())
    .addColumn('address_type_id', 'varchar(80)')
    .addColumn('address_line1', 'varchar(240)', (col) => col.notNull())
    .addColumn('address_line2', 'varchar(240)')
    .addColumn('city_id', 'varchar(80)')
    .addColumn('district_id', 'varchar(80)')
    .addColumn('state_id', 'varchar(80)')
    .addColumn('country_id', 'varchar(80)')
    .addColumn('pincode_id', 'varchar(80)')
    .addColumn('latitude', 'double precision')
    .addColumn('longitude', 'double precision')
    .addColumn('is_default', 'boolean', (col) => col.notNull().defaultTo(false))
    .addColumn('is_active', 'boolean', (col) => col.notNull().defaultTo(true))
    .addColumn('created_at', 'datetime', (col) => col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
    .addColumn('updated_at', 'datetime', (col) => col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
    .execute()

  await createCompanyLookupTable(database, 'company_emails', [
    ['email', 'VARCHAR(180) NOT NULL'],
    ['email_type', 'VARCHAR(80) NOT NULL'],
  ])
  await createCompanyLookupTable(database, 'company_phones', [
    ['phone_number', 'VARCHAR(80) NOT NULL'],
    ['phone_type', 'VARCHAR(80) NOT NULL'],
    ['is_primary', 'TINYINT(1) NOT NULL DEFAULT 0'],
  ])
  await createCompanyLookupTable(database, 'company_social_links', [
    ['platform', 'VARCHAR(80) NOT NULL'],
    ['url', 'VARCHAR(500) NOT NULL'],
  ])
  await database.schema
    .createTable('company_bank_accounts')
    .ifNotExists()
    .addColumn('id', 'integer', (col) => col.primaryKey().autoIncrement())
    .addColumn('company_id', 'integer', (col) => col.notNull())
    .addColumn('bank_name', 'varchar(160)', (col) => col.notNull())
    .addColumn('account_number', 'varchar(80)', (col) => col.notNull())
    .addColumn('account_holder_name', 'varchar(180)', (col) => col.notNull())
    .addColumn('ifsc', 'varchar(40)', (col) => col.notNull())
    .addColumn('branch', 'varchar(160)')
    .addColumn('qr_image_url', 'varchar(500)')
    .addColumn('is_primary', 'boolean', (col) => col.notNull().defaultTo(false))
    .addColumn('is_active', 'boolean', (col) => col.notNull().defaultTo(true))
    .addColumn('created_at', 'datetime', (col) => col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
    .addColumn('updated_at', 'datetime', (col) => col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
    .execute()
}

async function createCompanyLookupTable(database: TenantDatabase, table: string, columns: Array<[string, string]>) {
  await sql.raw(`
    CREATE TABLE IF NOT EXISTS \`${table}\` (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      company_id INT NOT NULL,
      ${columns.map(([name, definition]) => `\`${name}\` ${definition}`).join(',\n      ')},
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `).execute(database)
}

async function addColumnIfMissing(database: TenantDatabase, table: string, column: string, definition: string) {
  const existing = await sql<{ COLUMN_NAME: string }>`
    SELECT COLUMN_NAME
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = ${table}
      AND COLUMN_NAME = ${column}
  `.execute(database)

  if (existing.rows.length > 0) {
    return
  }

  await sql.raw(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${definition}`).execute(database)
}

async function seedAccountingYears(database: TenantDatabase) {
  const now = new Date()
  const currentFinancialYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1
  let currentYearId = 0

  for (let startYear = currentFinancialYear - 3; startYear <= currentFinancialYear + 5; startYear += 1) {
    const name = `FY ${startYear}-${String(startYear + 1).slice(-2)}`
    const startDate = `${startYear}-04-01`
    const endDate = `${startYear + 1}-03-31`
    const existing = await database
      .selectFrom('accounting_years')
      .select('id')
      .where('name', '=', name)
      .where('start_date', '=', startDate)
      .executeTakeFirst()

    if (existing) {
      if (startYear === currentFinancialYear) currentYearId = existing.id
      continue
    }

    const result = await database
      .insertInto('accounting_years')
      .values({
        name,
        start_date: startDate,
        end_date: endDate,
        books_start: startDate,
        is_active: true,
        deleted_at: null,
      })
      .executeTakeFirst()

    if (startYear === currentFinancialYear) currentYearId = Number(result.insertId)
  }

  return { currentYearId }
}

async function ensureDefaultCompany(
  database: TenantDatabase,
  tenant: Tenant,
  companyId: number,
  accountingYearId: number,
) {
  if (!accountingYearId) return

  const existing = await database
    .selectFrom('default_companies')
    .select('id')
    .where('company_id', '=', companyId)
    .where('accounting_year_id', '=', accountingYearId)
    .executeTakeFirst()

  if (existing) return

  await database
    .insertInto('default_companies')
    .values({
      tenant_id: tenant.id,
      industry_id: tenant.industry_id ?? 0,
      company_id: companyId,
      accounting_year_id: accountingYearId,
      is_active: true,
    })
    .execute()
}

async function seedCompanyChildren(database: TenantDatabase, companyId: number) {
  const logo = await database.selectFrom('company_logos').select('id').where('company_id', '=', companyId).executeTakeFirst()
  if (!logo) {
    await database.insertInto('company_logos').values([
      { company_id: companyId, logo_url: '/storage/logo/logo.svg', logo_type: 'logo', is_active: true },
      { company_id: companyId, logo_url: '/storage/logo/favicon.svg', logo_type: 'favicon', is_active: true },
    ]).execute()
  }

  const address = await database.selectFrom('address_book').select('id').where('owner_type', '=', 'company').where('owner_id', '=', companyId).executeTakeFirst()
  if (!address) {
    await database.insertInto('address_book').values({
      owner_type: 'company',
      owner_id: companyId,
      address_type_id: 'billing',
      address_line1: 'Primary business address',
      address_line2: null,
      city_id: null,
      district_id: null,
      state_id: null,
      country_id: null,
      pincode_id: null,
      latitude: null,
      longitude: null,
      is_default: true,
      is_active: true,
    }).execute()
  }
}

function normalizeTenantCompanyCode(tenant: Tenant) {
  return tenant.slug.toUpperCase().replace(/[^A-Z0-9]+/g, '_').slice(0, 64)
}

async function ensureRole(database: TenantDatabase, role: { code: string; name: string }) {
  const existing = await database
    .selectFrom('rbac_roles')
    .select('id')
    .where('code', '=', role.code)
    .executeTakeFirst()

  if (existing) {
    return
  }

  await database
    .insertInto('rbac_roles')
    .values({
      code: role.code,
      name: role.name,
      settings: JSON.stringify({ system: true }),
    })
    .execute()
}

async function ensurePolicy(
  database: TenantDatabase,
  policy: { code: string; name: string; description: string },
) {
  const existing = await database
    .selectFrom('rbac_policies')
    .select('id')
    .where('code', '=', policy.code)
    .executeTakeFirst()

  if (existing) {
    return
  }

  await database.insertInto('rbac_policies').values(policy).execute()
}

async function ensureRolePolicy(database: TenantDatabase, roleCode: string, policyCode: string) {
  const existing = await database
    .selectFrom('rbac_role_policies')
    .select('id')
    .where('role_code', '=', roleCode)
    .where('policy_code', '=', policyCode)
    .executeTakeFirst()

  if (existing) {
    return
  }

  await database
    .insertInto('rbac_role_policies')
    .values({ role_code: roleCode, policy_code: policyCode })
    .execute()
}
