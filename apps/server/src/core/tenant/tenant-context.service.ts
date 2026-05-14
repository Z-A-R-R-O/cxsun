import { Injectable } from '../decorators/injectable.js'
import { ForbiddenException, NotFoundException } from '../exceptions/http.exception.js'
import { getDatabase } from '../../infrastructure/database/connection.js'
import { getTenantDatabase } from '../../infrastructure/tenant-database/tenant-database.connection.js'
import type { TenantDatabaseSchema } from '../../infrastructure/tenant-database/tenant-database.schema.js'
import type { Tenant } from '../../modules/tenant/domain/tenant.types.js'
import type { Kysely } from 'kysely'

export interface TenantRequestHeaders {
  'x-tenant-code'?: string | string[]
  'x-user-email'?: string | string[]
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
    const tenantCode = firstHeader(headers['x-tenant-code']) ?? 'tenant_1'
    const userEmail = firstHeader(headers['x-user-email']) ?? 'admin@codexsun.local'
    const tenant = await findTenant(tenantCode)

    if (!tenant) {
      throw new NotFoundException('Tenant was not found.')
    }

    if (tenant.status !== 'active') {
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

    if (!access) {
      throw new ForbiddenException('User does not have access to this tenant.')
    }

    if (requiredPolicy) {
      await assertPolicy(tenant.id, requiredPolicy)
    }

    return {
      tenant,
      user: {
        id: access.user_id,
        email: access.email,
        role: access.role,
      },
      database: getTenantDatabase(tenant),
    }
  }
}

function firstHeader(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value
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

async function assertPolicy(tenantId: number, policyCode: string) {
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
}

