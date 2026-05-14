import { Injectable } from '../decorators/injectable.js'
import { ForbiddenException, NotFoundException } from '../exceptions/http.exception.js'
import { getDatabase } from '../../infrastructure/database/connection.js'
import { getTenantDatabase } from '../../infrastructure/tenant-database/tenant-database.connection.js'
import type { TenantDatabaseSchema } from '../../infrastructure/tenant-database/tenant-database.schema.js'
import type { Tenant } from '../../modules/tenant/domain/tenant.types.js'
import { verifyJwt } from '../../infrastructure/auth/jwt.js'
import type { Kysely } from 'kysely'

export interface TenantRequestHeaders {
  'x-tenant-code'?: string | string[]
  'x-user-email'?: string | string[]
  authorization?: string | string[]
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
    const tenantCode = firstHeader(headers['x-tenant-code']) ?? auth?.tenantCode ?? 'tenant_1'
    const userEmail = auth?.email ?? firstHeader(headers['x-user-email']) ?? 'sundar@sundar.com'
    const tenant = await findTenant(tenantCode)

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

  const query = getDatabase().selectFrom('tenants').selectAll()

  if (Number.isInteger(numericCode)) {
    return query.where('code', '=', numericCode).executeTakeFirst() as Promise<Tenant | undefined>
  }

  return query.where('slug', '=', normalized).executeTakeFirst() as Promise<Tenant | undefined>
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
