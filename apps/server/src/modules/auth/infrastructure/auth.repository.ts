import { Injectable } from '../../../core/decorators/injectable.js'
import { hashPassword } from '../../../infrastructure/auth/password-hash.js'
import { getDatabase } from '../../../infrastructure/database/connection.js'
import type { Tenant } from '../../../core/tenant/domain/tenant.types.js'
import type { AdminUserRecord, PlatformUserStatus, PlatformUserUpsertInput, TenantUserRecord, TenantUserSummary } from '../domain/auth.types.js'

@Injectable()
export class AuthRepository {
  findAdminUserByEmail(email: string) {
    return getDatabase()
      .selectFrom('admin_users')
      .select(['id', 'name', 'email', 'password_hash', 'role', 'status'])
      .where('email', '=', email)
      .executeTakeFirst()
  }

  listAdminUsers(): Promise<AdminUserRecord[]> {
    return getDatabase()
      .selectFrom('admin_users')
      .select(['id', 'name', 'email', 'role', 'status', 'created_at', 'updated_at'])
      .orderBy('name', 'asc')
      .execute()
      .then((rows) => rows.map((row) => ({
        id: row.id,
        name: row.name,
        email: row.email,
        role: row.role,
        status: row.status as PlatformUserStatus,
        created_at: dateString(row.created_at),
        updated_at: dateString(row.updated_at),
      })))
  }

  findAdminUserById(id: number) {
    return getDatabase()
      .selectFrom('admin_users')
      .select(['id', 'name', 'email', 'role', 'status'])
      .where('id', '=', id)
      .executeTakeFirst()
  }

  findAdminUserByEmailForUpsert(email: string, excludeId?: number) {
    let query = getDatabase().selectFrom('admin_users').select(['id']).where('email', '=', email)
    if (excludeId) query = query.where('id', '!=', excludeId)
    return query.executeTakeFirst()
  }

  async countActiveSuperAdmins() {
    const row = await getDatabase()
      .selectFrom('admin_users')
      .select(({ fn }) => fn.count<number>('id').as('admin_count'))
      .where('role', '=', 'super-admin')
      .where('status', '=', 'active')
      .executeTakeFirst()

    return Number(row?.admin_count ?? 0)
  }

  async upsertAdminUser(input: RequiredAdminUserInput): Promise<AdminUserRecord | undefined> {
    const database = getDatabase()
    const row = {
      name: input.name,
      email: input.email,
      role: input.role,
      status: input.status,
      updated_at: new Date().toISOString(),
    }

    if (input.id) {
      const update: typeof row & { password_hash?: string } = { ...row }
      if (input.password) update.password_hash = hashPassword(input.password)
      await database.updateTable('admin_users').set(update).where('id', '=', input.id).execute()
      const users = await this.listAdminUsers()
      return users.find((user) => user.id === input.id)
    }

    if (!input.password) {
      return undefined
    }

    await database
      .insertInto('admin_users')
      .values({
        ...row,
        password_hash: hashPassword(input.password),
      })
      .execute()

    const created = await database.selectFrom('admin_users').select('id').where('email', '=', input.email).executeTakeFirstOrThrow()
    const users = await this.listAdminUsers()
    return users.find((user) => user.id === created.id)
  }

  findTenantByLoginIdentifier(identifier: string): Promise<Tenant | undefined> {
    const normalizedCorporateId = normalizeCorporateId(identifier)
    const normalizedMobile = normalizeMobile(identifier)

    let query = getDatabase()
      .selectFrom('tenants')
      .selectAll()
      .where('tenants.deleted_at', 'is', null)

    query = normalizedMobile
      ? query.where((eb) => eb.or([
        eb('tenants.corporate_id', '=', normalizedCorporateId),
        eb('tenants.mobile', '=', normalizedMobile),
      ]))
      : query.where('tenants.corporate_id', '=', normalizedCorporateId)

    return query.executeTakeFirst() as Promise<Tenant | undefined>
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

  findTenantBySlug(slug: string): Promise<Tenant | undefined> {
    return getDatabase()
      .selectFrom('tenants')
      .selectAll()
      .where('slug', '=', slug)
      .where('deleted_at', 'is', null)
      .executeTakeFirst() as Promise<Tenant | undefined>
  }

  async listUserTenantSummaries(): Promise<TenantUserSummary[]> {
    const tenants = await getDatabase()
      .selectFrom('tenants')
      .selectAll()
      .orderBy('tenants.code', 'asc')
      .execute() as Tenant[]

    const summaries: TenantUserSummary[] = []

    for (const tenant of tenants) {
      let userCount = 0
      try {
        const row = await (await getTenantDatabaseForAuth(tenant))
          .selectFrom('users')
          .select(({ fn }) => fn.count<number>('id').as('user_count'))
          .executeTakeFirst()
        userCount = Number(row?.user_count ?? 0)
      } catch {
        userCount = 0
      }

      summaries.push({
        tenant_id: tenant.id,
        tenant_code: tenant.code,
        tenant_slug: tenant.slug,
        tenant_name: tenant.name,
        tenant_status: tenant.status,
        user_count: userCount,
      })
    }

    return summaries
  }

  async listUsersByTenant(tenantId: number): Promise<TenantUserRecord[]> {
    const tenant = await this.findTenantById(tenantId)
    if (!tenant) return []

    const rows = await (await getTenantDatabaseForAuth(tenant))
      .selectFrom('user_tenants')
      .innerJoin('users', 'users.id', 'user_tenants.user_id')
      .select([
        'user_tenants.id as access_id',
        'users.id as user_id',
        'users.name',
        'users.email',
        'user_tenants.role',
        'users.status',
        'users.created_at',
        'users.updated_at',
        'user_tenants.created_at as access_created_at',
      ])
      .orderBy('users.name', 'asc')
      .execute()

    return rows.map((row) => ({
      access_id: row.access_id,
      user_id: row.user_id,
      tenant_id: tenant.id,
      tenant_code: tenant.code,
      tenant_slug: tenant.slug,
      tenant_name: tenant.name,
      name: row.name,
      email: row.email,
      role: row.role,
      status: row.status as PlatformUserStatus,
      created_at: dateString(row.created_at),
      updated_at: dateString(row.updated_at),
      access_created_at: dateString(row.access_created_at),
    }))
  }

  async findUserById(tenantId: number, userId: number) {
    const tenant = await this.findTenantById(tenantId)
    if (!tenant) return undefined

    return (await getTenantDatabaseForAuth(tenant))
      .selectFrom('users')
      .select(['id', 'name', 'email', 'status'])
      .where('id', '=', userId)
      .executeTakeFirst()
  }

  async findUserByEmailForUpsert(tenantId: number, email: string, excludeUserId?: number) {
    const tenant = await this.findTenantById(tenantId)
    if (!tenant) return undefined

    let query = (await getTenantDatabaseForAuth(tenant)).selectFrom('users').select(['id']).where('email', '=', email)
    if (excludeUserId) query = query.where('id', '!=', excludeUserId)
    return query.executeTakeFirst()
  }

  async upsertTenantUser(input: RequiredPlatformUserInput) {
    const tenant = await this.findTenantById(input.tenant_id)
    if (!tenant) return undefined

    const database = await getTenantDatabaseForAuth(tenant)
    let userId = input.user_id

    if (userId) {
      const update: {
        name: string
        email: string
        status: PlatformUserStatus
        updated_at: Date
        password_hash?: string
      } = {
        name: input.name,
        email: input.email,
        status: input.status,
        updated_at: new Date(),
      }
      if (input.password) update.password_hash = hashPassword(input.password)

      await database.updateTable('users').set(update).where('id', '=', userId).execute()
    } else {
      if (!input.password) {
        return undefined
      }

      await database
        .insertInto('users')
        .values({
          uuid: nextLocalUuid(),
          name: input.name,
          email: input.email,
          password_hash: hashPassword(input.password),
          status: input.status,
          updated_at: new Date(),
        })
        .execute()
      const created = await database.selectFrom('users').select('id').where('email', '=', input.email).executeTakeFirstOrThrow()
      userId = created.id
    }

    if (!userId) {
      return undefined
    }

    const existingAccess = input.access_id
      ? await database.selectFrom('user_tenants').select('id').where('id', '=', input.access_id).executeTakeFirst()
      : await database
        .selectFrom('user_tenants')
        .select('id')
        .where('user_id', '=', userId)
        .executeTakeFirst()

    if (existingAccess) {
      await database.updateTable('user_tenants').set({ user_id: userId, role: input.role, status: input.status, updated_at: new Date() }).where('id', '=', existingAccess.id).execute()
    } else {
      await database.insertInto('user_tenants').values({ user_id: userId, uuid: nextLocalUuid(), role: input.role, status: input.status }).execute()
    }

    const rows = await this.listUsersByTenant(input.tenant_id)
    return rows.find((row) => row.user_id === userId)
  }

  private findTenantById(tenantId: number): Promise<Tenant | undefined> {
    return getDatabase()
      .selectFrom('tenants')
      .selectAll()
      .where('id', '=', tenantId)
      .executeTakeFirst() as Promise<Tenant | undefined>
  }
}

export interface RequiredPlatformUserInput extends PlatformUserUpsertInput {
  tenant_id: number
  name: string
  email: string
  role: string
  status: PlatformUserStatus
}

export interface RequiredAdminUserInput {
  id?: number
  name: string
  email: string
  password?: string
  role: string
  status: PlatformUserStatus
}

function normalizeDomain(value: string) {
  return value.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '').replace(/:\d+$/, '')
}

function normalizeCorporateId(value: string) {
  return value.trim().toUpperCase().replace(/[^A-Z0-9_]+/g, '_').replace(/^_+|_+$/g, '')
}

function normalizeMobile(value: string) {
  const normalized = value.replace(/\D/g, '')
  return normalized || null
}

function nextLocalUuid() {
  return Math.random().toString(36).slice(2, 10).toUpperCase()
}

function dateString(value: Date | string) {
  return value instanceof Date ? value.toISOString() : value
}

async function getTenantDatabaseForAuth(tenant: Tenant) {
  const { getTenantDatabase } = await import('../../../infrastructure/tenant-database/tenant-database.connection.js')
  return getTenantDatabase(tenant)
}
