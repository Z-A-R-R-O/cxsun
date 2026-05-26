import { sql } from 'kysely'
import { hashPassword, verifyPassword } from '../../../infrastructure/auth/password-hash.js'
import { nowIso, type PlatformDatabase, type PlatformDatabaseModule } from '../../../infrastructure/database/database-module.js'

export const authDatabaseModule: PlatformDatabaseModule = {
  name: 'auth-rbac',
  async migrate(database) {
    await sql.raw(`
      CREATE TABLE IF NOT EXISTS admin_users (
        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(191) NOT NULL,
        email VARCHAR(191) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(80) NOT NULL,
        status VARCHAR(32) NOT NULL DEFAULT 'active',
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
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

    for (const seededAdmin of adminSeedUsers()) {
      await ensureAdminUser(database, seededAdmin)
    }

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

async function ensureAdminUser(database: PlatformDatabase, data: { name: string; email: string; password: string; role: string }) {
  const existing = await database
    .selectFrom('admin_users')
    .select(['id', 'name', 'email', 'password_hash', 'role', 'status'])
    .where('email', '=', data.email)
    .executeTakeFirst()

  if (existing) {
    const passwordMatches = verifyPassword(data.password, existing.password_hash)
    const nextRow: {
      name?: string
      email?: string
      password_hash?: string
      role?: string
      status?: string
      updated_at?: string
    } = {}

    if (existing.name !== data.name) nextRow.name = data.name
    if (existing.email !== data.email) nextRow.email = data.email
    if (!passwordMatches) nextRow.password_hash = hashPassword(data.password)
    if (existing.role !== data.role) nextRow.role = data.role
    if (existing.status !== 'active') nextRow.status = 'active'

    if (Object.keys(nextRow).length > 0) {
      nextRow.updated_at = nowIso()
      await database.updateTable('admin_users').set(nextRow).where('id', '=', existing.id).execute()
    }

    return existing.id
  }

  const row = {
    name: data.name,
    email: data.email,
    password_hash: hashPassword(data.password),
    role: data.role,
    status: 'active',
    updated_at: nowIso(),
  }

  await database.insertInto('admin_users').values(row).execute()
  const created = await database.selectFrom('admin_users').select('id').where('email', '=', data.email).executeTakeFirstOrThrow()
  return created.id
}

function adminSeedUsers() {
  return [
    optionalAdminSeed({
      name: process.env.SUPER_ADMIN_NAME || 'Super Admin',
      email: process.env.SUPER_ADMIN_EMAIL,
      password: process.env.SUPER_ADMIN_PASSWORD,
      role: 'super-admin',
    }),
    optionalAdminSeed({
      name: process.env.SOFTWARE_ADMIN_NAME || 'Software Admin',
      email: process.env.SOFTWARE_ADMIN_EMAIL,
      password: process.env.SOFTWARE_ADMIN_PASSWORD,
      role: 'software-admin',
    }),
  ].filter((user): user is { name: string; email: string; password: string; role: string } => Boolean(user))
}

function optionalAdminSeed(input: { name: string; email?: string; password?: string; role: string }) {
  const email = input.email?.trim().toLowerCase()
  const password = input.password?.trim()
  if (!email || !password) return null

  return {
    name: input.name.trim() || input.role,
    email,
    password,
    role: input.role,
  }
}
