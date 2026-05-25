import { Injectable } from '../../../core/decorators/injectable.js'
import { hashPassword } from '../../../infrastructure/auth/password-hash.js'
import { getDatabase } from '../../../infrastructure/database/connection.js'
import { nowIso } from '../../../infrastructure/database/database-module.js'
import { ensureTenantUser, getTenantDatabase, provisionTenantDatabase } from '../../../infrastructure/tenant-database/tenant-database.connection.js'
import { dbConfig } from '../../config/index.js'

export interface AppSetupInput {
  code?: number | string | null
  name?: string
  slug?: string
  corporateId?: string
  mobile?: string
  database?: string
  dbServerMode?: 'same' | 'other' | string
  dbHost?: string
  dbPort?: number | string | null
  dbUser?: string
  dbSecretRef?: string
  domain?: string
  adminName?: string
  adminEmail?: string
  adminPassword?: string
  settings?: Record<string, unknown>
}

@Injectable()
export class AppSetupService {
  async create(input: AppSetupInput) {
    const name = input.name?.trim()
    const code = normalizeCode(input.code)
    const slug = normalizeSlug(input.slug || name || '')
    const corporateId = normalizeCorporateId(input.corporateId || slug || '')
    const mobile = normalizeMobile(input.mobile || '')
    const database = normalizeDatabaseName(input.database || slug)
    const dbServerMode = input.dbServerMode === 'other' ? 'other' : 'same'
    const dbHost = dbServerMode === 'same' ? dbConfig.tenant.defaults.host : input.dbHost?.trim() || ''
    const dbPort = dbServerMode === 'same' ? dbConfig.tenant.defaults.port : normalizePort(input.dbPort)
    const dbUser = dbServerMode === 'same' ? dbConfig.tenant.defaults.user : input.dbUser?.trim() || ''
    const dbSecretRef = dbServerMode === 'same' ? dbConfig.tenant.defaults.secretRef : normalizeSecretRef(input.dbSecretRef || '')
    const domain = normalizeDomain(input.domain || 'localhost')
    const adminName = input.adminName?.trim() || 'Tenant Admin'
    const adminEmail = input.adminEmail?.trim().toLowerCase() || ''
    const adminPassword = input.adminPassword?.trim() || ''

    if (!name) return { ok: false, error: 'Tenant name is required.' }
    if (code !== undefined && code < 100) return { ok: false, error: 'Tenant code must be an integer starting from 100.' }
    if (!slug) return { ok: false, error: 'Tenant slug is required.' }
    if (!corporateId) return { ok: false, error: 'Corporate ID is required.' }
    if (!database) return { ok: false, error: 'Tenant database name is required.' }
    if (!dbHost) return { ok: false, error: 'Tenant database host is required.' }
    if (!Number.isInteger(dbPort) || dbPort <= 0) return { ok: false, error: 'Tenant database port is invalid.' }
    if (!dbUser) return { ok: false, error: 'Tenant database user is required.' }
    if (!dbSecretRef) return { ok: false, error: 'Tenant database password secret is required.' }
    if (!domain) return { ok: false, error: 'Tenant domain is required.' }
    if (!adminEmail) return { ok: false, error: 'Admin email is required.' }
    if (adminEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminEmail)) {
      return { ok: false, error: 'Admin email is invalid.' }
    }
    if (!adminPassword) return { ok: false, error: 'Admin password is required.' }

    const duplicate = await findSetupDuplicate({ code, corporateId, mobile, slug, database, domain })
    if (duplicate) return duplicate

    const tenant = await createTenant({
      name,
      code,
      slug,
      corporateId,
      mobile,
      database,
      dbHost,
      dbPort,
      dbUser,
      dbSecretRef,
      dbServerMode,
      adminName,
      adminEmail,
      settings: input.settings,
    })

    const domainRecord = await createTenantDomain(tenant.id, domain, `${name} primary domain`)
    await ensureTenantPolicies(tenant.id)
    await provisionTenantDatabase(tenant)
    const admin = await createTenantAdmin({
      tenant,
      name: adminName,
      email: adminEmail,
      password: adminPassword,
    })

    return {
      ok: true,
      tenant,
      domain: domainRecord,
      admin,
    }
  }
}

type AppSetupTenant = {
  id: number
  code: number
  corporate_id: string
  mobile: string | null
  slug: string
  name: string
  status: 'active'
  db_type: 'mariadb'
  db_host: string
  db_port: number
  db_name: string
  db_user: string
  db_secret_ref: string
  company_count: number
  active_company_count: number
  company_concept_count: number
  payload_settings: string
  created_at: string
  updated_at: string
  deleted_at: string | null
}

async function findSetupDuplicate(input: { code?: number; corporateId: string; mobile: string | null; slug: string; database: string; domain: string }) {
  const database = getDatabase()
  const tenant = await database
    .selectFrom('tenants')
    .select(['code', 'corporate_id', 'mobile', 'slug', 'db_name'])
    .where((eb) => eb.or([
      ...(input.code === undefined ? [] : [eb('code', '=', input.code)]),
      eb('corporate_id', '=', input.corporateId),
      ...(input.mobile ? [eb('mobile', '=', input.mobile)] : []),
      eb('slug', '=', input.slug),
      eb('db_name', '=', input.database),
    ]))
    .executeTakeFirst()

  if (tenant?.code === input.code) return { ok: false, error: 'Tenant code is already used.' }
  if (tenant?.corporate_id === input.corporateId) return { ok: false, error: 'Corporate ID is already used.' }
  if (input.mobile && tenant?.mobile === input.mobile) return { ok: false, error: 'Mobile number is already used.' }
  if (tenant?.slug === input.slug) return { ok: false, error: 'Tenant slug is already used.' }
  if (tenant?.db_name === input.database) return { ok: false, error: 'Tenant database name is already used.' }

  const domain = await database
    .selectFrom('tenant_domains')
    .select(['id'])
    .where('domain', '=', input.domain)
    .where('deleted_at', 'is', null)
    .executeTakeFirst()

  if (domain && input.domain !== 'localhost') return { ok: false, error: 'Domain is already mapped.' }
  return null
}

async function createTenant(input: {
  name: string
  code?: number
  corporateId: string
  mobile: string | null
  slug: string
  database: string
  dbHost: string
  dbPort: number
  dbUser: string
  dbSecretRef: string
  dbServerMode: 'same' | 'other'
  adminName: string
  adminEmail: string
  settings?: Record<string, unknown>
}): Promise<AppSetupTenant> {
  const database = getDatabase()
  const nextCodeRow = await database
    .selectFrom('tenants')
    .select((eb) => eb.fn.max<number>('code').as('maxCode'))
    .executeTakeFirst()
  const code = input.code ?? Math.max(99, Number(nextCodeRow?.maxCode ?? 99)) + 1
  const now = nowIso()

  await database
    .insertInto('tenants')
    .values({
      code,
      corporate_id: input.corporateId,
      mobile: input.mobile,
      slug: input.slug,
      name: input.name,
      status: 'active',
      db_type: 'mariadb',
      db_host: input.dbHost,
      db_port: input.dbPort,
      db_name: input.database,
      db_user: input.dbUser,
      db_secret_ref: input.dbSecretRef,
      company_count: 0,
      active_company_count: 0,
      company_concept_count: 0,
      payload_settings: JSON.stringify({
        ui: { density: 'comfortable' },
        features: ['company.manage'],
        setup: {
          adminName: input.adminName,
          adminEmail: input.adminEmail,
          databaseServerMode: input.dbServerMode,
          completedAt: now,
          ...(input.settings ?? {}),
        },
      }),
      updated_at: now,
    })
    .execute()

  const tenant = await database
    .selectFrom('tenants')
    .selectAll()
    .where('code', '=', code)
    .executeTakeFirst()

  if (!tenant) throw new Error('Tenant setup insert failed.')
  return tenant as AppSetupTenant
}

async function createTenantDomain(tenantId: number, domain: string, label: string) {
  const existing = await getDatabase()
    .selectFrom('tenant_domains')
    .select(['domain', 'label'])
    .where('domain', '=', domain)
    .where('deleted_at', 'is', null)
    .executeTakeFirst()

  if (existing && domain === 'localhost') {
    return existing
  }

  const now = nowIso()
  await getDatabase()
    .insertInto('tenant_domains')
    .values({
      tenant_id: tenantId,
      domain,
      label,
      is_primary: 1,
      status: 'active',
      settings: JSON.stringify({ landing: { mode: 'tenant' } }),
      updated_at: now,
    })
    .execute()

  return getDatabase()
    .selectFrom('tenant_domains')
    .select(['domain', 'label'])
    .where('tenant_id', '=', tenantId)
    .where('domain', '=', domain)
    .executeTakeFirstOrThrow()
}

async function createTenantAdmin(input: { tenant: AppSetupTenant; name: string; email: string; password: string }) {
  const database = getTenantDatabase(input.tenant)
  const userId = await ensureTenantUser(database, {
    name: input.name,
    email: input.email,
    passwordHash: hashPassword(input.password),
    role: 'admin',
    status: 'active',
  })

  return { id: userId, name: input.name, email: input.email, role: 'admin', status: 'active' }
}

async function ensureTenantPolicies(tenantId: number) {
  for (const policy of [
    {
      code: 'company.manage',
      name: 'Manage companies',
      description: 'Create, update, suspend, and restore companies in a tenant database.',
    },
    {
      code: 'rbac.manage',
      name: 'Manage RBAC',
      description: 'Manage tenant roles and policy assignments.',
    },
  ]) {
    await ensurePolicy(policy)
    await ensureTenantPolicy(tenantId, policy.code)
  }
}

async function ensurePolicy(policy: { code: string; name: string; description: string }) {
  const database = getDatabase()
  const existing = await database.selectFrom('rbac_policies').select('id').where('code', '=', policy.code).executeTakeFirst()
  if (existing) return
  await database.insertInto('rbac_policies').values(policy).execute()
}

async function ensureTenantPolicy(tenantId: number, policyCode: string) {
  const database = getDatabase()
  const existing = await database
    .selectFrom('tenant_rbac_policies')
    .select('id')
    .where('tenant_id', '=', tenantId)
    .where('policy_code', '=', policyCode)
    .executeTakeFirst()

  if (existing) {
    await database
      .updateTable('tenant_rbac_policies')
      .set({ enabled: 1, updated_at: nowIso() })
      .where('id', '=', existing.id)
      .execute()
    return
  }

  await database
    .insertInto('tenant_rbac_policies')
    .values({ tenant_id: tenantId, policy_code: policyCode, enabled: 1 })
    .execute()
}

function normalizeSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

function normalizeCorporateId(value: string) {
  return value.trim().toUpperCase().replace(/[^A-Z0-9_]+/g, '_').replace(/^_+|_+$/g, '')
}

function normalizeMobile(value: string) {
  const normalized = value.replace(/\D/g, '')
  return normalized || null
}

function normalizeCode(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === '') return undefined
  const numberValue = Number(value)
  return Number.isInteger(numberValue) ? numberValue : 0
}

function normalizePort(value: number | string | null | undefined) {
  const numberValue = Number(value ?? dbConfig.tenant.defaults.port)
  return Number.isInteger(numberValue) ? numberValue : 0
}

function normalizeSecretRef(value: string) {
  return value.trim().toUpperCase().replace(/[^A-Z0-9_]+/g, '_').replace(/^_+|_+$/g, '')
}

function normalizeDatabaseName(value: string) {
  return normalizeSlug(value).replace(/_db$/, '') + '_db'
}

function normalizeDomain(value: string) {
  return value.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '').replace(/:\d+$/, '')
}
