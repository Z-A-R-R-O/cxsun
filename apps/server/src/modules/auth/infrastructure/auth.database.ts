import { sql } from 'kysely'
import { hashPassword } from '../../../infrastructure/auth/password-hash.js'
import { nowIso, type PlatformDatabase, type PlatformDatabaseModule } from '../../../infrastructure/database/database-module.js'

const SUPER_ADMIN_EMAIL = 'sundar@sundar.com'
const PLATFORM_ADMIN_EMAIL = 'admin@sundar.com'
const SUPER_ADMIN_PASSWORD = 'Kalarani1@@'
const PLATFORM_ADMIN_PASSWORD = 'Admin@123'
const DEMO_TENANT_ADMIN_PASSWORD = 'Admin@123'
const DEMO_USER_PASSWORD = 'User@123'

export const authDatabaseModule: PlatformDatabaseModule = {
  name: 'auth-rbac',
  async migrate(database) {
    await sql.raw(`
      CREATE TABLE IF NOT EXISTS users (
        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(191) NOT NULL,
        email VARCHAR(191) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        status VARCHAR(32) NOT NULL DEFAULT 'active',
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `).execute(database)

    await sql.raw(`
      CREATE TABLE IF NOT EXISTS user_tenants (
        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        tenant_id INT NOT NULL,
        role VARCHAR(80) NOT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uq_user_tenants_user_tenant_role (user_id, tenant_id, role),
        INDEX idx_user_tenants_tenant (tenant_id)
      )
    `).execute(database)

    await sql.raw(`
      CREATE TABLE IF NOT EXISTS rbac_policies (
        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        code VARCHAR(120) NOT NULL UNIQUE,
        name VARCHAR(191) NOT NULL,
        description TEXT NOT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `).execute(database)

    await sql.raw(`
      CREATE TABLE IF NOT EXISTS tenant_rbac_policies (
        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        tenant_id INT NOT NULL,
        policy_code VARCHAR(120) NOT NULL,
        enabled TINYINT(1) NOT NULL DEFAULT 1,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uq_tenant_policy (tenant_id, policy_code)
      )
    `).execute(database)
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
      tenantSlug: 'demo_app',
      role: 'software-admin',
    })
    await ensureUserWithTenant(database, {
      name: 'Demo Admin',
      email: 'demo.admin@localhost',
      password: DEMO_TENANT_ADMIN_PASSWORD,
      tenantSlug: 'demo_app',
      role: 'admin',
    })
    await ensureUserWithTenant(database, {
      name: 'Demo User',
      email: 'demo.user@localhost',
      password: DEMO_USER_PASSWORD,
      tenantSlug: 'demo_app',
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
