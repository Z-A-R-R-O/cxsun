import mysql from 'mysql2'
import { createConnection } from 'mysql2/promise'
import { Kysely, MysqlDialect, sql } from 'kysely'
import type { TenantDatabaseSchema } from './tenant-database.schema.js'
import type { Tenant } from '../../core/tenant/domain/tenant.types.js'
import { hashPassword } from '../auth/password-hash.js'
import { getDatabase } from '../database/connection.js'
import { nowIso } from '../database/database-module.js'
import { dispatchPublicUuid } from '../../shared/helpers/public-uuid.js'
import { migrateCommonModuleTables, seedCommonModuleTables } from '../../modules/common/index.js'
import { migrateSalesEntryTables } from '../../modules/entries/sales/index.js'
import { migrateExportSalesEntryTables } from '../../modules/entries/export-sales/index.js'
import { migratePurchaseEntryTables } from '../../modules/entries/purchase/index.js'
import { migratePurchaseReceiptTables } from '../../modules/stock/inward/purchase-receipt/index.js'
import { migrateDeliveryNoteTables } from '../../modules/stock/outward/delivery-note/index.js'
import { migrateStockLedgerTables } from '../../modules/stock/ledger/index.js'
import { migrateReceiptEntryTables } from '../../modules/entries/receipt/index.js'
import { migratePaymentEntryTables } from '../../modules/entries/payment/index.js'
import { migrateAccountsTables } from '../../modules/accounts/index.js'
import { migrateCompanySettingsTables } from '../../modules/settings/company-settings/index.js'
import { migrateDocumentSettingsTables } from '../../modules/settings/document-settings/index.js'
import { migrateGstComplianceTables } from '../../modules/gst/gst-compliance/index.js'
import { migrateMediaTables } from '../../modules/media/index.js'
import { migrateMailTables } from '../../modules/mail/index.js'
import { migrateTaskManagerTables } from '../../modules/task-manager/index.js'
import { migrateAuditorContactCredentialTables } from '../../modules/auditor/contact-credential/index.js'
import { migrateAuditorGstFilingTables } from '../../modules/auditor/gst-filing/index.js'
import { migrateSiteSliderTables, seedDefaultSiteSliders } from '../../modules/site/slider/database/site-slider.migration.js'
import { migrateContactMasterTable } from '../../modules/master/contact/index.js'
import { migrateProductMasterTable } from '../../modules/master/product/index.js'
import { migrateOrderMasterTable } from '../../modules/master/order/index.js'
import { dbConfig } from '../../framework/config/index.js'

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
        connectionLimit: dbConfig.tenant.connectionLimit,
        connectTimeout: dbConfig.tenant.connectTimeoutMs,
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
    connectTimeout: dbConfig.tenant.connectTimeoutMs,
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

  await createCompanyChildTables(database)
  await createContactCommunicationTables(database)
  await migrateCommonModuleTables(database)
  await migrateSalesEntryTables(database)
  await migrateExportSalesEntryTables(database)
  await migratePurchaseEntryTables(database)
  await migratePurchaseReceiptTables(database)
  await migrateDeliveryNoteTables(database)
  await migrateStockLedgerTables(database)
  await migrateReceiptEntryTables(database)
  await migratePaymentEntryTables(database)
  await migrateAccountsTables(database as never)
  await migrateCompanySettingsTables(database)
  await migrateDocumentSettingsTables(database)
  await migrateGstComplianceTables(database)
  await migrateMediaTables(database as never)
  await migrateMailTables(database)
  await migrateTaskManagerTables(database as never)
  await migrateAuditorContactCredentialTables(database)
  await migrateAuditorGstFilingTables(database)
  await migrateSiteSliderTables(database as never)
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

  await createTenantUsersTable(database)

  await seedTenantDatabase(database, tenant)
  await syncTenantCompanyMetrics(tenant)
}

export async function tenantDatabaseExists(tenant: Tenant): Promise<boolean> {
  const connection = await createConnection({
    host: tenant.db_host,
    port: tenant.db_port,
    user: tenant.db_user,
    password: getTenantDatabasePassword(tenant.db_secret_ref),
    multipleStatements: false,
    connectTimeout: dbConfig.tenant.connectTimeoutMs,
  })

  try {
    const [rows] = await connection.query(
      'SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME = ? LIMIT 1',
      [tenant.db_name],
    )
    return Array.isArray(rows) && rows.length > 0
  } finally {
    await connection.end()
  }
}

export async function setupTenantClientDatabase(tenant: Tenant) {
  await provisionTenantDatabase(tenant)
  const database = getTenantDatabase(tenant)
  const company = await ensureTenantDefaultCompany(database, tenant)
  const adminSeed = tenantAdminSeed()
  const admin = adminSeed
    ? await ensureTenantUser(database, {
      name: adminSeed.name,
      email: adminSeed.email,
      passwordHash: hashPassword(adminSeed.password),
      role: 'admin',
      status: 'active',
    })
    : null
  await syncTenantCompanyMetrics(tenant)

  return {
    ok: true,
    tenantId: tenant.id,
    database: tenant.db_name,
    company,
    admin: adminSeed && admin
      ? {
        id: admin,
        name: adminSeed.name,
        email: adminSeed.email,
        role: 'admin',
        status: 'active',
      }
      : null,
  }
}

function tenantAdminSeed() {
  const email = process.env.TENANT_ADMIN_EMAIL?.trim().toLowerCase()
  const password = process.env.TENANT_ADMIN_PASSWORD?.trim()
  if (!email || !password) return null

  return {
    name: process.env.TENANT_ADMIN_NAME?.trim() || 'Tenant Admin',
    email,
    password,
  }
}

function getTenantDatabasePassword(secretRef: string) {
  return dbConfig.tenant.password(secretRef)
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
  const now = nowIso()

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

function readTenantCompanies(tenant: Tenant) {
  try {
    const settings = JSON.parse(tenant.payload_settings || '{}') as {
      liveScope?: { companies?: unknown }
    }
    const companies = settings.liveScope?.companies
    return Array.isArray(companies)
      ? companies.map(String).map((company) => company.trim()).filter(Boolean)
      : []
  } catch {
    return []
  }
}

function readTenantIndustryCode(tenant: Tenant) {
  try {
    const settings = JSON.parse(tenant.payload_settings || '{}') as {
      liveScope?: { industry?: unknown }
    }
    return typeof settings.liveScope?.industry === 'string' ? settings.liveScope.industry.trim() : ''
  } catch {
    return ''
  }
}

async function seedTenantDatabase(database: TenantDatabase, tenant: Tenant) {
  await seedCommonModuleTables(database)
  await seedDefaultSiteSliders(database as never, tenant)
  await seedScopedCompanies(database, tenant)
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
    {
      code: 'mail.manage',
      name: 'Manage mail',
      description: 'Allows configuring tenant mail settings and sending tenant mail.',
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

  for (const roleCode of ['admin', 'manager', 'staff']) {
    await ensureRolePolicy(database, roleCode, 'mail.manage')
  }

}

async function seedScopedCompanies(database: TenantDatabase, tenant: Tenant) {
  const companies = readTenantCompanies(tenant)
  if (companies.length === 0) {
    return
  }
  const industryCode = readTenantIndustryCode(tenant)
  const industry = industryCode
    ? await getDatabase().selectFrom('industries').select('id').where('code', '=', industryCode).executeTakeFirst()
    : undefined
  const seededIndustryId = Number(industry?.id ?? 0)

  for (const [index, companyName] of companies.entries()) {
    const code = companyName
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 64) || `${tenant.slug.toUpperCase()}_${index + 1}`

    const existing = await database
      .selectFrom('companies')
      .select(['id', 'industry_id'])
      .where((eb) => eb.or([
        eb('code', '=', code),
        eb('name', '=', companyName),
      ]))
      .where('deleted_at', 'is', null)
      .executeTakeFirst()

    const row = {
      tenant_id: tenant.id,
      industry_id: seededIndustryId,
      code,
      name: companyName,
      legal_name: companyName,
      tagline: null,
      short_about: null,
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
      description: null,
      primary_email: null,
      primary_phone: null,
      is_primary: index === 0,
      is_active: true,
      status: 'active',
      settings: JSON.stringify({ timezone: 'Asia/Calcutta', currency: 'INR' }),
      features: JSON.stringify(['company.manage']),
    }

    if (existing) {
      const { industry_id: _seededIndustryId, ...existingRow } = row
      await database
        .updateTable('companies')
        .set({
          ...existingRow,
          ...(Number(existing.industry_id ?? 0) <= 0 && seededIndustryId > 0 ? { industry_id: seededIndustryId } : {}),
        })
        .where('id', '=', existing.id)
        .execute()
      continue
    }

    await database.insertInto('companies').values({ uuid: nextPublicUuid(), ...row }).execute()
  }
}

async function ensureTenantDefaultCompany(database: TenantDatabase, tenant: Tenant) {
  const existingCompany = await database
    .selectFrom('companies')
    .select(['id', 'name', 'code', 'industry_id'])
    .where('deleted_at', 'is', null)
    .orderBy('is_primary', 'desc')
    .orderBy('id', 'asc')
    .executeTakeFirst()
  const years = await ensureCurrentAccountingYear(database)

  if (existingCompany) {
    await ensureDefaultCompany(database, tenant, Number(existingCompany.id), years.currentYearId, Number(existingCompany.industry_id ?? 0))
    return {
      id: Number(existingCompany.id),
      name: existingCompany.name,
      code: existingCompany.code,
    }
  }

  const companyCode = tenant.slug
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 64) || `TENANT_${tenant.id}`

  await database
    .insertInto('companies')
    .values({
      uuid: nextPublicUuid(),
      tenant_id: tenant.id,
      industry_id: 0,
      code: companyCode,
      name: tenant.name,
      legal_name: tenant.name,
      tagline: null,
      short_about: null,
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
      description: null,
      primary_email: null,
      primary_phone: null,
      is_primary: true,
      is_active: true,
      status: 'active',
      settings: JSON.stringify({ timezone: 'Asia/Calcutta', currency: 'INR' }),
      features: JSON.stringify(['company.manage']),
    })
    .execute()

  const company = await database
    .selectFrom('companies')
    .select(['id', 'name', 'code'])
    .where('code', '=', companyCode)
    .where('deleted_at', 'is', null)
    .executeTakeFirstOrThrow()

  await ensureDefaultCompany(database, tenant, Number(company.id), years.currentYearId, 0)

  return {
    id: Number(company.id),
    name: company.name,
    code: company.code,
  }
}

async function createTenantUsersTable(database: TenantDatabase) {
  await database.schema
    .createTable('users')
    .ifNotExists()
    .addColumn('id', 'integer', (col) => col.primaryKey().autoIncrement())
    .addColumn('uuid', 'char(8)')
    .addColumn('name', 'varchar(191)', (col) => col.notNull())
    .addColumn('email', 'varchar(191)', (col) => col.notNull().unique())
    .addColumn('password_hash', 'varchar(255)', (col) => col.notNull())
    .addColumn('status', 'varchar(32)', (col) => col.notNull().defaultTo('active'))
    .addColumn('created_at', 'datetime', (col) => col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
    .addColumn('updated_at', 'datetime', (col) => col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
    .execute()

  await database.schema
    .createTable('user_tenants')
    .ifNotExists()
    .addColumn('id', 'integer', (col) => col.primaryKey().autoIncrement())
    .addColumn('uuid', 'char(8)')
    .addColumn('user_id', 'integer', (col) => col.notNull())
    .addColumn('role', 'varchar(80)', (col) => col.notNull())
    .addColumn('status', 'varchar(32)', (col) => col.notNull().defaultTo('active'))
    .addColumn('created_at', 'datetime', (col) => col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
    .addColumn('updated_at', 'datetime', (col) => col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
    .execute()

}

export async function ensureTenantUser(
  database: TenantDatabase,
  user: { name: string; email: string; passwordHash: string; role: string; status?: string },
) {
  const existing = await database
    .selectFrom('users')
    .select('id')
    .where('email', '=', user.email)
    .executeTakeFirst()

  const row = {
    name: user.name,
    email: user.email,
    password_hash: user.passwordHash,
    status: user.status ?? 'active',
    updated_at: new Date(),
  }

  let userId = existing?.id
  if (existing) {
    await database.updateTable('users').set(row).where('id', '=', existing.id).execute()
  } else {
    await database
      .insertInto('users')
      .values({
        ...row,
        uuid: nextPublicUuid(),
      })
      .execute()
    userId = (await database.selectFrom('users').select('id').where('email', '=', user.email).executeTakeFirstOrThrow()).id
  }

  if (!userId) {
    throw new Error(`Tenant user was not persisted: ${user.email}`)
  }

  await ensureTenantUserAccess(database, userId, user.role, user.status ?? 'active')
  return userId
}

async function ensureTenantUserAccess(database: TenantDatabase, userId: number, role: string, status: string) {
  const existing = await database
    .selectFrom('user_tenants')
    .select('id')
    .where('user_id', '=', userId)
    .where('role', '=', role)
    .executeTakeFirst()

  const row = {
    user_id: userId,
    role,
    status,
    updated_at: new Date(),
  }

  if (existing) {
    await database.updateTable('user_tenants').set(row).where('id', '=', existing.id).execute()
    return
  }

  await database.insertInto('user_tenants').values({ ...row, uuid: nextPublicUuid() }).execute()
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
    .addColumn('landing_app', 'varchar(80)', (col) => col.notNull().defaultTo('application'))
    .addColumn('is_active', 'boolean', (col) => col.notNull().defaultTo(true))
    .addColumn('created_at', 'datetime', (col) => col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
    .addColumn('updated_at', 'datetime', (col) => col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
    .execute()

  await sql.raw(`ALTER TABLE default_companies ADD COLUMN IF NOT EXISTS landing_app VARCHAR(80) NOT NULL DEFAULT 'application'`).execute(database)

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

async function ensureCurrentAccountingYear(database: TenantDatabase) {
  const seeded = await seedAccountingYears(database)
  if (seeded.currentYearId) return seeded

  const startYear = currentFinancialYearStart(new Date())
  const year = financialYearSeed(startYear)

  await database
    .insertInto('accounting_years')
    .values({
      uuid: nextPublicUuid(),
      name: year.name,
      start_date: year.startDate,
      end_date: year.endDate,
      books_start: year.startDate,
      is_current_year: true,
      is_active: true,
    })
    .execute()

  const currentYear = await database
    .selectFrom('accounting_years')
    .select('id')
    .where('is_current_year', '=', true)
    .orderBy('id', 'desc')
    .executeTakeFirstOrThrow()

  return { currentYearId: Number(currentYear.id) }
}

function currentFinancialYearStart(date: Date) {
  const year = date.getFullYear()
  return date.getMonth() >= 3 ? year : year - 1
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
      landing_app: readTenantLandingApp(tenant),
      is_active: true,
    })
    .execute()
}

function readTenantLandingApp(tenant: Tenant) {
  try {
    const settings = JSON.parse(String(tenant.payload_settings ?? '{}')) as { apps?: { landing?: unknown } }
    const landing = settings.apps?.landing
    return typeof landing === 'string' && landing.trim() ? landing.trim() : 'application'
  } catch {
    return 'application'
  }
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

function nextPublicUuid() {
  return dispatchPublicUuid()
}
