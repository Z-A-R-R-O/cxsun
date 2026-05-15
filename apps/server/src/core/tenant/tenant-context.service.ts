import { Injectable } from '../decorators/injectable.js'
import { ForbiddenException, NotFoundException, UnauthorizedException } from '../exceptions/http.exception.js'
import { getDatabase } from '../../infrastructure/database/connection.js'
import { getTenantDatabase } from '../../infrastructure/tenant-database/tenant-database.connection.js'
import type { TenantDatabaseSchema } from '../../infrastructure/tenant-database/tenant-database.schema.js'
import type { Tenant } from '../../modules/tenant/domain/tenant.types.js'
import { verifyJwt } from '../../infrastructure/auth/jwt.js'
import type { Kysely } from 'kysely'

const tenantColumns = [
  'id',
  'code',
  'slug',
  'name',
  'status',
  'db_type',
  'db_host',
  'db_port',
  'db_name',
  'db_user',
  'db_secret_ref',
  'company_count',
  'active_company_count',
  'company_concept_count',
  'payload_settings',
  'created_at',
  'updated_at',
  'deleted_at',
] as const

export interface TenantRequestHeaders {
  'x-tenant-code'?: string | string[]
  'x-user-email'?: string | string[]
  authorization?: string | string[]
  host?: string | string[]
}

export interface TenantRuntimeContext {
  tenant: Tenant
  user: {
    id: number
    email: string
    role: string
  }
  database: Kysely<TenantDatabaseSchema>
}

@Injectable()
export class TenantContextService {
  async resolve(headers: TenantRequestHeaders, requiredPolicy?: string): Promise<TenantRuntimeContext> {
    const token = bearerToken(firstHeader(headers.authorization))
    const auth = verifyJwt(token)
    if (!auth) {
      throw new UnauthorizedException('Authentication is required.')
    }

    const tenantCode = firstHeader(headers['x-tenant-code']) ?? auth?.tenantCode
    const userEmail = auth.email
    const tenant = tenantCode
      ? await findTenant(tenantCode)
      : await findTenantByDomain(firstHeader(headers.host) ?? '')

    if (!tenant) {
      throw new NotFoundException('Tenant was not found.')
    }

    const isSuperAdminToken = auth?.superAdmin === true || auth?.role === 'super-admin'

    if (tenant.status !== 'active' && !isSuperAdminToken) {
      throw new ForbiddenException('Tenant is not active.')
    }

    const access = await getDatabase()
      .selectFrom('users')
      .innerJoin('user_tenants', 'user_tenants.user_id', 'users.id')
      .select(['users.id as user_id', 'users.email', 'user_tenants.role'])
      .where('users.email', '=', userEmail)
      .where('users.status', '=', 'active')
      .where('user_tenants.tenant_id', '=', tenant.id)
      .executeTakeFirst()

    if (!access && !isSuperAdminToken) {
      throw new ForbiddenException('User does not have access to this tenant.')
    }

    const role = access?.role ?? auth?.role ?? 'super-admin'
    const database = getTenantDatabase(tenant)

    return {
      tenant,
      user: {
        id: access?.user_id ?? auth?.sub ?? 0,
        email: access?.email ?? userEmail,
        role,
      },
      database: await assertPolicies({
        database,
        isSuperAdmin: role === 'super-admin' || isSuperAdminToken,
        policyCode: requiredPolicy,
        role,
        tenantId: tenant.id,
      }),
    }
  }
}

function firstHeader(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value
}

function bearerToken(value?: string) {
  if (!value?.toLowerCase().startsWith('bearer ')) {
    return undefined
  }

  return value.slice('bearer '.length).trim()
}

async function findTenant(value: string): Promise<Tenant | undefined> {
  const normalized = value.trim()
  const numericCode = Number(normalized)

  const query = getDatabase().selectFrom('tenants').select(tenantColumns)

  if (Number.isInteger(numericCode)) {
    return query.where('code', '=', numericCode).executeTakeFirst() as Promise<Tenant | undefined>
  }

  return query.where('slug', '=', normalized).executeTakeFirst() as Promise<Tenant | undefined>
}

async function findTenantByDomain(value: string): Promise<Tenant | undefined> {
  const domain = normalizeDomain(value)
  if (!domain) return undefined

  return getDatabase()
    .selectFrom('tenant_domains')
    .innerJoin('tenants', 'tenants.id', 'tenant_domains.tenant_id')
    .select(tenantColumns.map((column) => `tenants.${column}` as const))
    .where('tenant_domains.domain', '=', domain)
    .where('tenant_domains.status', '=', 'active')
    .where('tenant_domains.deleted_at', 'is', null)
    .executeTakeFirst() as Promise<Tenant | undefined>
}

function normalizeDomain(value: string) {
  return value.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '').replace(/:\d+$/, '')
}

async function assertPolicies({
  database,
  isSuperAdmin,
  policyCode,
  role,
  tenantId,
}: {
  database: Kysely<TenantDatabaseSchema>
  isSuperAdmin: boolean
  policyCode?: string
  role: string
  tenantId: number
}) {
  if (!policyCode || isSuperAdmin) {
    return database
  }

  const policy = await getDatabase()
    .selectFrom('tenant_rbac_policies')
    .select('id')
    .where('tenant_id', '=', tenantId)
    .where('policy_code', '=', policyCode)
    .where('enabled', '=', 1)
    .executeTakeFirst()

  if (!policy) {
    throw new ForbiddenException(`Tenant policy is not enabled: ${policyCode}`)
  }

  const rolePolicy = await database
    .selectFrom('rbac_role_policies')
    .select('id')
    .where('role_code', '=', role)
    .where('policy_code', '=', policyCode)
    .executeTakeFirst()

  if (!rolePolicy) {
    throw new ForbiddenException(`Role policy is not enabled: ${policyCode}`)
  }

  return database
}
