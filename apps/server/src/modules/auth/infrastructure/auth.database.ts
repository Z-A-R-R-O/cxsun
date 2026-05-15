import { sql } from 'kysely'
import { hashPassword } from '../../../infrastructure/auth/password-hash.js'
import { nowIso, type PlatformDatabase, type PlatformDatabaseModule } from '../../../infrastructure/database/database-module.js'

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

    const allTenants = await database.selectFrom('tenants').selectAll().execute()

    for (const tenant of allTenants) {
      for (const policyCode of ['company.manage', 'rbac.manage']) {
        await ensureTenantPolicy(database, tenant.id, policyCode)
      }
    }

    const superAdminId = await ensureUser(database, {
      name: 'sundar',
      email: 'sundar@sundar.com',
      password: 'Kalarani1@@',
    })

    for (const tenant of allTenants) {
      await ensureUserTenant(database, superAdminId, tenant.id, 'super-admin')
    }

    await ensureUserWithTenant(database, { name: 'Sundar Admin', email: 'sundar.admin@sundar.com', password: 'Sundar@123', tenantSlug: 'sundar', role: 'tenant-admin' })
    await ensureUserWithTenant(database, { name: 'Software Admin', email: 'software.admin@sundar.com', password: 'Admin@123', tenantSlug: 'sundar', role: 'admin' })
    await ensureUserWithTenant(database, { name: 'Sathish Admin', email: 'sathish.admin@sundar.com', password: 'Sundar@123', tenantSlug: 'sathish', role: 'tenant-admin' })
    await ensureUserWithTenant(database, { name: 'Sampath Admin', email: 'sampath.admin@sundar.com', password: 'User@123', tenantSlug: 'sampath', role: 'tenant-admin' })
    await ensureUserWithTenant(database, { name: 'Sathasivam Admin', email: 'sathasivam.admin@sundar.com', password: 'User@123', tenantSlug: 'sathasivam', role: 'tenant-admin' })
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
