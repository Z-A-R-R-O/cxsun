import { Injectable } from '../../../core/decorators/injectable.js'
import { hashPassword } from '../../../infrastructure/auth/password-hash.js'
import { getDatabase } from '../../../infrastructure/database/connection.js'
import { nowIso } from '../../../infrastructure/database/database-module.js'
import type { AuthTenantAccess, PlatformUserStatus, PlatformUserUpsertInput, TenantUserRecord, TenantUserSummary } from '../domain/auth.types.js'

@Injectable()
export class AuthRepository {
  findUserByEmail(email: string) {
    return getDatabase()
      .selectFrom('users')
      .select(['id', 'name', 'email', 'password_hash', 'status'])
      .where('email', '=', email)
      .executeTakeFirst()
  }

  listTenantAccess(userId: number): Promise<AuthTenantAccess[]> {
    return getDatabase()
      .selectFrom('user_tenants')
      .innerJoin('tenants', 'tenants.id', 'user_tenants.tenant_id')
      .select([
        'tenants.id as id',
        'tenants.code as code',
        'tenants.slug as slug',
        'tenants.name as name',
        'tenants.status as status',
        'user_tenants.role as role',
      ])
      .where('user_tenants.user_id', '=', userId)
      .orderBy('tenants.code', 'asc')
      .execute() as Promise<AuthTenantAccess[]>
  }

  async findTenantSlugByDomain(hostOrDomain: string): Promise<string | undefined> {
    const domain = normalizeDomain(hostOrDomain)
    if (!domain) return undefined

    const row = await getDatabase()
      .selectFrom('tenant_domains')
      .innerJoin('tenants', 'tenants.id', 'tenant_domains.tenant_id')
      .select('tenants.slug')
      .where('tenant_domains.domain', '=', domain)
      .where('tenant_domains.status', '=', 'active')
      .where('tenant_domains.deleted_at', 'is', null)
      .executeTakeFirst()

    return row?.slug
  }

  async listUserTenantSummaries(): Promise<TenantUserSummary[]> {
    const rows = await getDatabase()
      .selectFrom('tenants')
      .leftJoin('user_tenants', 'user_tenants.tenant_id', 'tenants.id')
      .select(({ fn }) => [
        'tenants.id as tenant_id',
        'tenants.code as tenant_code',
        'tenants.slug as tenant_slug',
        'tenants.name as tenant_name',
        'tenants.status as tenant_status',
        fn.count<number>('user_tenants.id').as('user_count'),
      ])
      .groupBy(['tenants.id', 'tenants.code', 'tenants.slug', 'tenants.name', 'tenants.status'])
      .orderBy('tenants.code', 'asc')
      .execute()

    return rows.map((row) => ({ ...row, user_count: Number(row.user_count ?? 0) }))
  }

  listUsersByTenant(tenantId: number): Promise<TenantUserRecord[]> {
    return getDatabase()
      .selectFrom('user_tenants')
      .innerJoin('users', 'users.id', 'user_tenants.user_id')
      .innerJoin('tenants', 'tenants.id', 'user_tenants.tenant_id')
      .select([
        'user_tenants.id as access_id',
        'users.id as user_id',
        'tenants.id as tenant_id',
        'tenants.code as tenant_code',
        'tenants.slug as tenant_slug',
        'tenants.name as tenant_name',
        'users.name',
        'users.email',
        'user_tenants.role',
        'users.status',
        'users.created_at',
        'users.updated_at',
        'user_tenants.created_at as access_created_at',
      ])
      .where('tenants.id', '=', tenantId)
      .orderBy('users.name', 'asc')
      .execute() as Promise<TenantUserRecord[]>
  }

  findUserById(userId: number) {
    return getDatabase()
      .selectFrom('users')
      .select(['id', 'name', 'email', 'status'])
      .where('id', '=', userId)
      .executeTakeFirst()
  }

  findUserByEmailForUpsert(email: string, excludeUserId?: number) {
    let query = getDatabase().selectFrom('users').select(['id']).where('email', '=', email)
    if (excludeUserId) query = query.where('id', '!=', excludeUserId)
    return query.executeTakeFirst()
  }

  async upsertPlatformUser(input: RequiredPlatformUserInput) {
    const database = getDatabase()
    const now = nowIso()
    let userId = input.user_id

    if (userId) {
      const update: {
        name: string
        email: string
        status: PlatformUserStatus
        updated_at: string
        password_hash?: string
      } = {
        name: input.name,
        email: input.email,
        status: input.status,
        updated_at: now,
      }
      if (input.password) update.password_hash = hashPassword(input.password)

      await database.updateTable('users').set(update).where('id', '=', userId).execute()
    } else {
      await database
        .insertInto('users')
        .values({
          name: input.name,
          email: input.email,
          password_hash: hashPassword(input.password || 'User@123'),
          status: input.status,
          updated_at: now,
        })
        .execute()
      const created = await database.selectFrom('users').select('id').where('email', '=', input.email).executeTakeFirstOrThrow()
      userId = created.id
    }

    const existingAccess = input.access_id
      ? await database.selectFrom('user_tenants').select('id').where('id', '=', input.access_id).executeTakeFirst()
      : await database
        .selectFrom('user_tenants')
        .select('id')
        .where('user_id', '=', userId)
        .where('tenant_id', '=', input.tenant_id)
        .executeTakeFirst()

    if (existingAccess) {
      await database.updateTable('user_tenants').set({ user_id: userId, tenant_id: input.tenant_id, role: input.role }).where('id', '=', existingAccess.id).execute()
    } else {
      await database.insertInto('user_tenants').values({ user_id: userId, tenant_id: input.tenant_id, role: input.role }).execute()
    }

    const rows = await this.listUsersByTenant(input.tenant_id)
    return rows.find((row) => row.user_id === userId)
  }
}

export interface RequiredPlatformUserInput extends PlatformUserUpsertInput {
  tenant_id: number
  name: string
  email: string
  role: string
  status: PlatformUserStatus
}

function normalizeDomain(value: string) {
  return value.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '').replace(/:\d+$/, '')
}
