import mysql from 'mysql2'
import { createConnection } from 'mysql2/promise'
import { Kysely, MysqlDialect, sql } from 'kysely'
import type { TenantDatabaseSchema } from './tenant-database.schema.js'
import type { Tenant } from '../../modules/tenant/domain/tenant.types.js'
import { getDatabase } from '../database/connection.js'

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
  await syncTenantCompanyMetrics(tenant)
}

function getTenantDatabasePassword(secretRef: string) {
  return process.env[secretRef] ?? process.env.MARIADB_ROOT_PASSWORD ?? 'Computer.1'
}

export async function syncTenantCompanyMetrics(tenant: Tenant): Promise<void> {
  const database = getTenantDatabase(tenant)
  const metrics = await sql<{
    company_count: number | string | bigint | null
    active_company_count: number | string | bigint | null
    company_concept_count: number | string | bigint | null
  }>`
    SELECT
      COUNT(*) AS company_count,
      SUM(CASE WHEN is_active = 1 AND status = 'active' THEN 1 ELSE 0 END) AS active_company_count,
      SUM(
        CASE
          WHEN COALESCE(NULLIF(TRIM(short_about), ''), NULLIF(TRIM(description), ''), NULLIF(TRIM(tagline), '')) IS NOT NULL
          THEN 1
          ELSE 0
        END
      ) AS company_concept_count
    FROM companies
    WHERE deleted_at IS NULL
  `.execute(database)

  const row = metrics.rows[0]
  const now = new Date().toISOString()

  await getDatabase()
    .updateTable('tenants')
    .set({
      company_count: toMetricNumber(row?.company_count),
      active_company_count: toMetricNumber(row?.active_company_count),
      company_concept_count: toMetricNumber(row?.company_concept_count),
      updated_at: now,
    })
    .where('id', '=', tenant.id)
    .execute()
}

function toMetricNumber(value: number | string | bigint | null | undefined) {
  const numberValue = Number(value ?? 0)
  return Number.isFinite(numberValue) ? numberValue : 0
}

async function seedTenantDatabase(database: TenantDatabase, tenant: Tenant) {
  const years = await seedAccountingYears(database)
  const seededCompanies = tenantCompanyCatalog[tenant.slug] ?? [
    {
      code: normalizeTenantCompanyCode(tenant),
      name: `${tenant.name} Company`,
      industryCode: 'software',
      concept: `${tenant.name} licensed software workspace.`,
    },
  ]

  for (const [index, companySeed] of seededCompanies.entries()) {
    const industryId = await findIndustryId(companySeed.industryCode)
    const companyId = await ensureTenantCompany(database, tenant, {
      ...companySeed,
      industryId,
      isPrimary: index === 0,
    })
    await seedCompanyChildren(database, companyId)
    await ensureDefaultCompany(database, tenant, companyId, years.currentYearId, industryId)
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

const tenantCompanyCatalog: Record<string, Array<{
  code: string
  name: string
  industryCode: string
  concept: string
}>> = {
  sundar: [
    { code: 'CODEXSUN', name: 'Codexsun', industryCode: 'software', concept: 'Software brand portfolio.' },
    { code: 'AARAN_ASSOCIATES', name: 'Aaran Associates', industryCode: 'accountant', concept: 'Auditor office and bookkeeping practice.' },
    { code: 'AARAN_INFO_TECH', name: 'Aaran Info Tech', industryCode: 'computer', concept: 'Computer sales and service.' },
    { code: 'TIRUPUR_DIRECT', name: 'Tirupur Direct', industryCode: 'ecommerce', concept: 'Tirupur based garment ecommerce.' },
    { code: 'AARAN_CONNECT', name: 'Aaran Connect', industryCode: 'marketing', concept: 'Buyer and seller connection network like IndiaMART.' },
  ],
  sathish: [
    { code: 'GANAPATHI_PRINTING', name: 'Ganapathi Printing', industryCode: 'offset_printing', concept: 'Offset printing business.' },
  ],
  sampath: [
    { code: 'COTTON_KNITS', name: 'Cotton Knits', industryCode: 'garment', concept: 'Garment manufacturing unit.' },
    { code: 'POLYMADE_INDIA', name: 'Polymade India', industryCode: 'garment', concept: 'Garment manufacturing unit.' },
  ],
  sathasivam: [
    { code: 'SUKKRAA_GARMENTS', name: 'Sukkraa Garments', industryCode: 'garment', concept: 'Garment manufacturing unit.' },
    { code: 'MATHAN_KNITTERS', name: 'Mathan Knitters', industryCode: 'garment', concept: 'Garment manufacturing unit.' },
  ],
}

async function findIndustryId(code: string) {
  const industry = await getDatabase()
    .selectFrom('industries')
    .select('id')
    .where('code', '=', code)
    .executeTakeFirst()

  return industry?.id ?? 0
}

async function ensureTenantCompany(
  database: TenantDatabase,
  tenant: Tenant,
  data: {
    code: string
    name: string
    industryId: number
    concept: string
    isPrimary: boolean
  },
) {
  const existing = await database
    .selectFrom('companies')
    .select('id')
    .where('code', '=', data.code)
    .executeTakeFirst()

  const row = {
    tenant_id: tenant.id,
    industry_id: data.industryId,
    code: data.code,
    name: data.name,
    legal_name: data.name,
    tagline: data.concept,
    short_about: data.concept,
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
    description: data.concept,
    primary_email: `hello@${tenant.slug}.local`,
    primary_phone: null,
    is_primary: data.isPrimary,
    is_active: true,
    status: 'active',
    settings: JSON.stringify({ timezone: 'Asia/Calcutta', currency: 'INR' }),
    features: JSON.stringify(['company.manage']),
    deleted_at: null,
  }

  if (existing) {
    await database
      .updateTable('companies')
      .set({ ...row, updated_at: new Date() })
      .where('id', '=', existing.id)
      .execute()
    return existing.id
  }

  const result = await database.insertInto('companies').values(row).executeTakeFirst()
  return Number(result.insertId)
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
  industryId: number,
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
      industry_id: industryId,
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
