import mysql from 'mysql2'
import { createConnection } from 'mysql2/promise'
import { Kysely, MysqlDialect, sql } from 'kysely'
import type { TenantDatabaseSchema } from './tenant-database.schema.js'
import type { Tenant } from '../../core/tenant/domain/tenant.types.js'
import { getDatabase } from '../database/connection.js'
import { dispatchPublicUuid } from '../../shared/helpers/public-uuid.js'
import { migrateCommonModuleTables, seedCommonModuleTables } from '../../modules/common/index.js'
import { migrateSalesEntryTables } from '../../modules/entries/sales/index.js'
import { migratePurchaseEntryTables } from '../../modules/entries/purchase/index.js'
import { migrateReceiptEntryTables } from '../../modules/entries/receipt/index.js'
import { migratePaymentEntryTables } from '../../modules/entries/payment/index.js'
import { migrateCompanySettingsTables } from '../../modules/settings/company-settings/index.js'
import { migrateDocumentSettingsTables } from '../../modules/settings/document-settings/index.js'
import { migrateMediaTables } from '../../modules/media/index.js'
import { migrateContactMasterTable } from '../../modules/master/contact/index.js'
import { migrateProductMasterTable } from '../../modules/master/product/index.js'
import { migrateOrderMasterTable } from '../../modules/master/order/index.js'

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
        dateStrings: ['DATE'],
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
    .addColumn('uuid', 'char(8)')
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
  await createContactCommunicationTables(database)
  await migrateCommonModuleTables(database)
  await migrateSalesEntryTables(database)
  await migratePurchaseEntryTables(database)
  await migrateReceiptEntryTables(database)
  await migratePaymentEntryTables(database)
  await migrateCompanySettingsTables(database)
  await migrateDocumentSettingsTables(database)
  await migrateMediaTables(database as never)
  await migrateContactMasterTable(database)
  await migrateProductMasterTable(database)
  await migrateOrderMasterTable(database)

  await database.schema
    .createTable('rbac_roles')
    .ifNotExists()
    .addColumn('id', 'integer', (col) => col.primaryKey().autoIncrement())
    .addColumn('uuid', 'char(8)')
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
    .addColumn('uuid', 'char(8)')
    .addColumn('code', 'varchar(128)', (col) => col.notNull().unique())
    .addColumn('name', 'varchar(191)', (col) => col.notNull())
    .addColumn('description', 'text', (col) => col.notNull())
    .addColumn('created_at', 'datetime', (col) => col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
    .execute()

  await database.schema
    .createTable('rbac_role_policies')
    .ifNotExists()
    .addColumn('id', 'integer', (col) => col.primaryKey().autoIncrement())
    .addColumn('uuid', 'char(8)')
    .addColumn('role_code', 'varchar(64)', (col) => col.notNull())
    .addColumn('policy_code', 'varchar(128)', (col) => col.notNull())
    .addColumn('created_at', 'datetime', (col) => col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
    .execute()

  await seedTenantDatabase(database, tenant)
  await ensureTenantUuidColumns(database)
  await syncTenantCompanyMetrics(tenant)
}

function getTenantDatabasePassword(secretRef: string) {
  return process.env[secretRef] ?? process.env.MARIADB_ROOT_PASSWORD
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
  await seedCommonModuleTables(database)
  const years = await seedAccountingYears(database)
  const existingDefault = await database
    .selectFrom('default_companies')
    .select('id')
    .where('is_active', '=', true)
    .executeTakeFirst()

  if (!existingDefault && years.currentYearId) {
    const company = await database
      .selectFrom('companies')
      .select(['id', 'industry_id'])
      .where('deleted_at', 'is', null)
      .orderBy('is_primary', 'desc')
      .orderBy('id', 'asc')
      .executeTakeFirst()

    if (company) {
      await ensureDefaultCompany(database, tenant, Number(company.id), years.currentYearId, Number(company.industry_id ?? 0))
    }
  }

  await retireLegacyRoles(database)

  for (const role of [
    { code: 'admin', name: 'Admin', settings: { system: true, canAssignRoles: ['manager', 'staff', 'user'] } },
    { code: 'manager', name: 'Manager', settings: { system: true, canAssignRoles: ['staff', 'user'] } },
    { code: 'staff', name: 'Staff', settings: { system: true, canEditData: true } },
    { code: 'user', name: 'User', settings: { system: true, employee: true } },
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

  for (const roleCode of ['admin', 'manager', 'staff', 'user']) {
    await ensureRolePolicy(database, roleCode, 'company.manage')
  }

  for (const roleCode of ['admin']) {
    await ensureRolePolicy(database, roleCode, 'rbac.manage')
  }
}

async function ensureCompanyColumns(database: TenantDatabase) {
  await addColumnIfMissing(database, 'companies', 'uuid', 'CHAR(8) NULL AFTER id')
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
    .addColumn('uuid', 'char(8)')
    .addColumn('name', 'varchar(80)', (col) => col.notNull())
    .addColumn('start_date', 'date', (col) => col.notNull())
    .addColumn('end_date', 'date', (col) => col.notNull())
    .addColumn('books_start', 'date', (col) => col.notNull())
    .addColumn('is_current_year', 'boolean', (col) => col.notNull().defaultTo(false))
    .addColumn('is_active', 'boolean', (col) => col.notNull().defaultTo(true))
    .addColumn('created_at', 'datetime', (col) => col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
    .addColumn('updated_at', 'datetime', (col) => col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
    .addColumn('deleted_at', 'datetime')
    .execute()

  await database.schema
    .createTable('default_companies')
    .ifNotExists()
    .addColumn('id', 'integer', (col) => col.primaryKey().autoIncrement())
    .addColumn('uuid', 'char(8)')
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
    .addColumn('uuid', 'char(8)')
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
    .addColumn('uuid', 'char(8)')
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
    .addColumn('uuid', 'char(8)')
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
      uuid CHAR(8) NULL,
      company_id INT NOT NULL,
      ${columns.map(([name, definition]) => `\`${name}\` ${definition}`).join(',\n      ')},
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `).execute(database)
}

async function createContactCommunicationTables(database: TenantDatabase) {
  await sql.raw(`
    CREATE TABLE IF NOT EXISTS contact_emails (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      uuid CHAR(8) NULL,
      contact_id INT NOT NULL,
      email VARCHAR(180) NOT NULL,
      email_type VARCHAR(80) NOT NULL,
      is_primary TINYINT(1) NOT NULL DEFAULT 0,
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `).execute(database)

  await sql.raw(`
    CREATE TABLE IF NOT EXISTS contact_phones (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      uuid CHAR(8) NULL,
      contact_id INT NOT NULL,
      phone_number VARCHAR(80) NOT NULL,
      phone_type VARCHAR(80) NOT NULL,
      is_primary TINYINT(1) NOT NULL DEFAULT 0,
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `).execute(database)

  await sql.raw(`
    CREATE TABLE IF NOT EXISTS contact_social_links (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      uuid CHAR(8) NULL,
      contact_id INT NOT NULL,
      platform VARCHAR(80) NOT NULL,
      url VARCHAR(500) NOT NULL,
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `).execute(database)

  await sql.raw(`
    CREATE TABLE IF NOT EXISTS contact_bank_accounts (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      uuid CHAR(8) NULL,
      contact_id INT NOT NULL,
      bank_name VARCHAR(160) NOT NULL,
      account_number VARCHAR(80) NOT NULL,
      account_holder_name VARCHAR(180) NOT NULL,
      ifsc VARCHAR(40) NOT NULL,
      branch VARCHAR(160) NULL,
      is_primary TINYINT(1) NOT NULL DEFAULT 0,
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `).execute(database)

  await sql.raw(`
    CREATE TABLE IF NOT EXISTS contact_gst_details (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      uuid CHAR(8) NULL,
      contact_id INT NOT NULL,
      gstin VARCHAR(30) NOT NULL,
      state VARCHAR(120) NOT NULL,
      is_default TINYINT(1) NOT NULL DEFAULT 0,
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
  const existingYears = await database
    .selectFrom('accounting_years')
    .select(['id', 'name', 'is_current_year'])
    .execute()

  for (const year of existingYears) {
    const dates = parseFinancialYearDates(year.name)
    if (!dates) continue

    await database
      .updateTable('accounting_years')
      .set({
        start_date: dates.startDate,
        end_date: dates.endDate,
        books_start: dates.startDate,
      })
      .where('id', '=', year.id)
      .execute()
  }

  const currentYear = await database
    .selectFrom('accounting_years')
    .select('id')
    .where('is_current_year', '=', true)
    .where('deleted_at', 'is', null)
    .orderBy('id', 'desc')
    .executeTakeFirst()

  return { currentYearId: currentYear?.id ?? 0 }
}

function financialYearSeed(startYear: number) {
  return {
    startYear,
    name: `FY ${startYear}-${String(startYear + 1).slice(-2)}`,
    startDate: `${startYear}-04-01`,
    endDate: `${startYear + 1}-03-31`,
  }
}

function parseFinancialYearDates(name: string) {
  const match = /^FY\s+(\d{4})-(\d{2})$/.exec(name.trim())
  if (!match) return null

  return financialYearSeed(Number(match[1]))
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
    .orderBy('id', 'asc')
    .executeTakeFirst()

  if (existing) {
    await database
      .updateTable('default_companies')
      .set({
        tenant_id: tenant.id,
        industry_id: industryId,
        company_id: companyId,
        accounting_year_id: accountingYearId,
        is_active: true,
        updated_at: new Date(),
      })
      .where('id', '=', existing.id)
      .execute()
    return
  }

  await database
    .insertInto('default_companies')
    .values({
      tenant_id: tenant.id,
      uuid: nextPublicUuid(),
      industry_id: industryId,
      company_id: companyId,
      accounting_year_id: accountingYearId,
      is_active: true,
    })
    .execute()
}

async function retireLegacyRoles(database: TenantDatabase) {
  const legacyRoles = ['owner', 'super-admin', 'tenant-admin', 'tenant-user']
  await database
    .deleteFrom('rbac_role_policies')
    .where('role_code', 'in', legacyRoles)
    .execute()
  await database
    .deleteFrom('rbac_roles')
    .where('code', 'in', legacyRoles)
    .execute()
}

async function ensureRole(database: TenantDatabase, role: { code: string; name: string; settings: Record<string, unknown> }) {
  const existing = await database
    .selectFrom('rbac_roles')
    .select('id')
    .where('code', '=', role.code)
    .executeTakeFirst()

  if (existing) {
    await database
      .updateTable('rbac_roles')
      .set({
        name: role.name,
        settings: JSON.stringify(role.settings),
        updated_at: new Date(),
      })
      .where('id', '=', existing.id)
      .execute()
    return
  }

  await database
    .insertInto('rbac_roles')
    .values({
      uuid: nextPublicUuid(),
      code: role.code,
      name: role.name,
      settings: JSON.stringify(role.settings),
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

  await database.insertInto('rbac_policies').values({ ...policy, uuid: nextPublicUuid() }).execute()
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
    .values({ uuid: nextPublicUuid(), role_code: roleCode, policy_code: policyCode })
    .execute()
}

const tenantUuidTables = [
  'companies',
  'accounting_years',
  'default_companies',
  'company_logos',
  'address_book',
  'company_emails',
  'company_phones',
  'contact_emails',
  'contact_phones',
  'contact_social_links',
  'contact_bank_accounts',
  'contact_gst_details',
  'company_social_links',
  'company_bank_accounts',
  'rbac_roles',
  'rbac_policies',
  'rbac_role_policies',
  'common_countries',
  'common_states',
  'common_districts',
  'common_cities',
  'common_pincodes',
  'common_contact_groups',
  'common_contact_types',
  'common_address_types',
  'common_bank_names',
  'common_product_groups',
  'common_product_categories',
  'common_product_types',
  'common_units',
  'common_hsn_codes',
  'common_taxes',
  'common_brands',
  'common_colours',
  'common_sizes',
  'common_currencies',
  'common_order_types',
  'common_styles',
  'common_transports',
  'common_warehouses',
  'common_destinations',
  'common_payment_terms',
  'common_months',
  'common_stock_rejection_types',
  'sales_entries',
  'sales_entry_items',
  'sales_entry_comments',
  'sales_entry_activities',
  'purchase_entries',
  'purchase_entry_items',
  'purchase_entry_comments',
  'purchase_entry_activities',
  'receipt_entries',
  'receipt_entry_comments',
  'receipt_entry_activities',
  'payment_entries',
  'payment_entry_comments',
  'payment_entry_activities',
  'company_settings',
  'document_number_settings',
  'media_assets',
  'media_asset_links',
  'media_asset_activities',
  'masters_contacts',
  'masters_products',
  'masters_orders',
] as const

async function ensureTenantUuidColumns(database: TenantDatabase) {
  for (const table of tenantUuidTables) {
    const exists = await sql<{ TABLE_NAME: string }>`
      SELECT TABLE_NAME
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = ${table}
    `.execute(database)

    if (!exists.rows.length) continue

    await addColumnIfMissing(database, table, 'uuid', 'CHAR(8) NULL AFTER id')
    await backfillUuidValues(database, table)

    try {
      await sql.raw(`ALTER TABLE \`${table}\` MODIFY \`uuid\` CHAR(8) NOT NULL`).execute(database)
      await sql.raw(`ALTER TABLE \`${table}\` ADD UNIQUE KEY \`uk_${table}_uuid\` (\`uuid\`)`).execute(database)
    } catch {
      // Existing tenant databases may already have the NOT NULL column or unique key.
    }
  }
}

async function backfillUuidValues(database: TenantDatabase, table: string) {
  const rows = await sql<{ id: number | string | bigint }>`
    SELECT id FROM ${sql.table(table)} WHERE uuid IS NULL OR uuid = ''
  `.execute(database)

  for (const row of rows.rows) {
    await sql`
      UPDATE ${sql.table(table)}
      SET uuid = ${await nextUniquePublicUuid(database, table)}
      WHERE id = ${Number(row.id)}
    `.execute(database)
  }
}

async function nextUniquePublicUuid(database: TenantDatabase, table: string) {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const uuid = nextPublicUuid()
    const existing = await sql<{ id: number | string | bigint }>`
      SELECT id FROM ${sql.table(table)} WHERE uuid = ${uuid} LIMIT 1
    `.execute(database)

    if (!existing.rows.length) {
      return uuid
    }
  }

  throw new Error(`Could not generate public uuid for ${table}.`)
}

function nextPublicUuid() {
  return dispatchPublicUuid()
}
