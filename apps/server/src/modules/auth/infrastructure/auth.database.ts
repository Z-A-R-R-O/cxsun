import { sql } from 'kysely'
import { hashPassword } from '../../../infrastructure/auth/password-hash.js'
import { nowIso, type PlatformDatabase, type PlatformDatabaseModule } from '../../../infrastructure/database/database-module.js'

const SUPER_ADMIN_EMAIL = 'sundar@sundar.com'
const PLATFORM_ADMIN_EMAIL = 'admin@sundar.com'
const SUPER_ADMIN_PASSWORD = 'Kalarani1@@'
const PLATFORM_ADMIN_PASSWORD = 'Admin@123'
const AARAN_TENANT_ADMIN_PASSWORD = 'Admin@123'
const AARAN_USER_PASSWORD = 'User@123'

export const authDatabaseModule: PlatformDatabaseModule = {
  name: 'auth-rbac',
  async migrate(database) {
    await database.schema
      .createTable('users')
      .ifNotExists()
      .addColumn('id', 'integer', (col) => col.primaryKey().autoIncrement())
      .addColumn('name', 'text', (col) => col.notNull())
      .addColumn('email', 'text', (col) => col.notNull().unique())
      .addColumn('password_hash', 'text', (col) => col.notNull())
      .addColumn('status', 'text', (col) => col.notNull().defaultTo('active'))
      .addColumn('created_at', 'text', (col) => col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
      .addColumn('updated_at', 'text', (col) => col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
      .execute()

    await database.schema
      .createTable('user_tenants')
      .ifNotExists()
      .addColumn('id', 'integer', (col) => col.primaryKey().autoIncrement())
      .addColumn('user_id', 'integer', (col) => col.notNull())
      .addColumn('tenant_id', 'integer', (col) => col.notNull())
      .addColumn('role', 'text', (col) => col.notNull())
      .addColumn('created_at', 'text', (col) => col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
      .execute()

    await database.schema
      .createTable('rbac_policies')
      .ifNotExists()
      .addColumn('id', 'integer', (col) => col.primaryKey().autoIncrement())
      .addColumn('code', 'text', (col) => col.notNull().unique())
      .addColumn('name', 'text', (col) => col.notNull())
      .addColumn('description', 'text', (col) => col.notNull())
      .addColumn('created_at', 'text', (col) => col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
      .execute()

    await database.schema
      .createTable('tenant_rbac_policies')
      .ifNotExists()
      .addColumn('id', 'integer', (col) => col.primaryKey().autoIncrement())
      .addColumn('tenant_id', 'integer', (col) => col.notNull())
      .addColumn('policy_code', 'text', (col) => col.notNull())
      .addColumn('enabled', 'integer', (col) => col.notNull().defaultTo(1))
      .addColumn('created_at', 'text', (col) => col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
      .addColumn('updated_at', 'text', (col) => col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
      .execute()
  },
  async seed(database) {
    await ensurePolicy(database, {
      code: 'company.manage',
      name: 'Manage companies',
      description: 'Create, update, suspend, and restore companies in a tenant database.',
    })
    await ensurePolicy(database, {
      code: 'rbac.manage',
      name: 'Manage RBAC',
      description: 'Manage tenant roles and policy assignments.',
    })

    const allTenants = await database
      .selectFrom('tenants')
      .selectAll()
      .where('status', '=', 'active')
      .where('deleted_at', 'is', null)
      .execute()

    for (const tenant of allTenants) {
      for (const policyCode of ['company.manage', 'rbac.manage']) {
        await ensureTenantPolicy(database, tenant.id, policyCode)
      }
    }

    const superAdminId = await ensureUser(database, {
      name: 'Sundar',
      email: SUPER_ADMIN_EMAIL,
      password: SUPER_ADMIN_PASSWORD,
    })
    await ensureOnlySuperAdminUser(database, superAdminId)

    for (const tenant of allTenants) {
      await ensureUserTenant(database, superAdminId, tenant.id, 'super-admin')
    }

    await ensureUserWithTenant(database, {
      name: 'Software Admin',
      email: PLATFORM_ADMIN_EMAIL,
      password: PLATFORM_ADMIN_PASSWORD,
      tenantSlug: 'aaran',
      role: 'software-admin',
    })
    await ensureUserWithTenant(database, {
      name: 'Aaran Admin',
      email: 'aaranoffice@gmail.com',
      password: AARAN_TENANT_ADMIN_PASSWORD,
      tenantSlug: 'aaran',
      role: 'admin',
    })
    await ensureUserWithTenant(database, {
      name: 'Aaran User',
      email: 'user.aaran@aaran.com',
      password: AARAN_USER_PASSWORD,
      tenantSlug: 'aaran',
      role: 'user',
    })
    await retireLegacySeedUsers(database)
  },
}

async function ensurePolicy(database: PlatformDatabase, data: { code: string; name: string; description: string }) {
  const existing = await database.selectFrom('rbac_policies').select('id').where('code', '=', data.code).executeTakeFirst()
  if (existing) return
  await database.insertInto('rbac_policies').values(data).execute()
}

async function ensureTenantPolicy(database: PlatformDatabase, tenantId: number, policyCode: string) {
  const existing = await database
    .selectFrom('tenant_rbac_policies')
    .select('id')
    .where('tenant_id', '=', tenantId)
    .where('policy_code', '=', policyCode)
    .executeTakeFirst()

  if (existing) {
    await database.updateTable('tenant_rbac_policies').set({ enabled: 1, updated_at: nowIso() }).where('id', '=', existing.id).execute()
    return
  }

  await database.insertInto('tenant_rbac_policies').values({ tenant_id: tenantId, policy_code: policyCode, enabled: 1 }).execute()
}

async function ensureUser(database: PlatformDatabase, data: { name: string; email: string; password: string }) {
  const existing = await database.selectFrom('users').select('id').where('email', '=', data.email).executeTakeFirst()
  const row = {
    name: data.name,
    email: data.email,
    password_hash: hashPassword(data.password),
    status: 'active',
    updated_at: nowIso(),
  }

  if (existing) {
    await database.updateTable('users').set(row).where('id', '=', existing.id).execute()
    return existing.id
  }

  await database.insertInto('users').values(row).execute()
  const created = await database.selectFrom('users').select('id').where('email', '=', data.email).executeTakeFirstOrThrow()
  return created.id
}

async function ensureUserWithTenant(
  database: PlatformDatabase,
  data: { name: string; email: string; password: string; tenantSlug: string; role: string },
) {
  const userId = await ensureUser(database, data)
  const tenant = await database.selectFrom('tenants').select('id').where('slug', '=', data.tenantSlug).executeTakeFirstOrThrow()
  await ensureUserTenant(database, userId, tenant.id, data.role)
}

async function ensureUserTenant(database: PlatformDatabase, userId: number, tenantId: number, role: string) {
  const existing = await database
    .selectFrom('user_tenants')
    .select('id')
    .where('user_id', '=', userId)
    .where('tenant_id', '=', tenantId)
    .executeTakeFirst()

  if (existing) {
    await database.updateTable('user_tenants').set({ role }).where('id', '=', existing.id).execute()
    return
  }

  await database.insertInto('user_tenants').values({ user_id: userId, tenant_id: tenantId, role }).execute()
}

async function ensureOnlySuperAdminUser(database: PlatformDatabase, superAdminId: number) {
  await database
    .updateTable('user_tenants')
    .set({ role: 'admin' })
    .where('role', '=', 'super-admin')
    .where('user_id', '!=', superAdminId)
    .execute()
}

async function retireLegacySeedUsers(database: PlatformDatabase) {
  for (const email of [
    'sundar.admin@sundar.com',
    'software.admin@sundar.com',
    'sathish.admin@sundar.com',
    'sampath.admin@sundar.com',
    'sathasivam.admin@sundar.com',
  ]) {
    const user = await database
      .selectFrom('users')
      .select('id')
      .where('email', '=', email)
      .executeTakeFirst()

    if (!user) {
      continue
    }

    await database
      .updateTable('users')
      .set({ status: 'suspend', updated_at: nowIso() })
      .where('id', '=', user.id)
      .execute()
  }
}
