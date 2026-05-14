import { mkdirSync } from 'fs'
import { dirname, resolve } from 'path'
import { createRequire } from 'module'
import { Kysely, SqliteDialect, sql } from 'kysely'
import type BetterSqlite3 from 'better-sqlite3'
import type { DatabaseSchema } from './schema.js'
import { hashPassword } from '../auth/password-hash.js'

const require = createRequire(import.meta.url)
const Database = require('better-sqlite3') as typeof BetterSqlite3

const databasePath = resolve(
  process.cwd(),
  process.cwd().replaceAll('\\', '/').endsWith('/apps/server')
    ? '../../storage/database/cxsun.sqlite'
    : 'storage/database/cxsun.sqlite',
)

let db: Kysely<DatabaseSchema> | null = null

export function getDatabase() {
  if (db) {
    return db
  }

  mkdirSync(dirname(databasePath), { recursive: true })

  db = new Kysely<DatabaseSchema>({
    dialect: new SqliteDialect({
      database: new Database(databasePath),
    }),
  })

  return db
}

export async function initializeDatabase() {
  const database = getDatabase()

  await database.schema
    .createTable('site_pages')
    .ifNotExists()
    .addColumn('id', 'integer', (col) => col.primaryKey().autoIncrement())
    .addColumn('slug', 'text', (col) => col.notNull().unique())
    .addColumn('nav_label', 'text', (col) => col.notNull())
    .addColumn('title', 'text', (col) => col.notNull())
    .addColumn('eyebrow', 'text', (col) => col.notNull())
    .addColumn('summary', 'text', (col) => col.notNull())
    .addColumn('body', 'text', (col) => col.notNull())
    .addColumn('sort_order', 'integer', (col) => col.notNull())
    .execute()

  await database.schema
    .createTable('site_services')
    .ifNotExists()
    .addColumn('id', 'integer', (col) => col.primaryKey().autoIncrement())
    .addColumn('title', 'text', (col) => col.notNull())
    .addColumn('description', 'text', (col) => col.notNull())
    .addColumn('sort_order', 'integer', (col) => col.notNull())
    .execute()

  await database.schema
    .createTable('site_posts')
    .ifNotExists()
    .addColumn('id', 'integer', (col) => col.primaryKey().autoIncrement())
    .addColumn('title', 'text', (col) => col.notNull())
    .addColumn('excerpt', 'text', (col) => col.notNull())
    .addColumn('published_at', 'text', (col) => col.notNull())
    .addColumn('sort_order', 'integer', (col) => col.notNull())
    .execute()

  await database.schema
    .createTable('site_messages')
    .ifNotExists()
    .addColumn('id', 'integer', (col) => col.primaryKey().autoIncrement())
    .addColumn('name', 'text', (col) => col.notNull())
    .addColumn('email', 'text', (col) => col.notNull())
    .addColumn('message', 'text', (col) => col.notNull())
    .addColumn('created_at', 'text', (col) =>
      col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`),
    )
    .execute()

  await database.schema
    .createTable('industries')
    .ifNotExists()
    .addColumn('id', 'integer', (col) => col.primaryKey().autoIncrement())
    .addColumn('code', 'text', (col) => col.notNull().unique())
    .addColumn('name', 'text', (col) => col.notNull())
    .addColumn('payload_schema', 'text', (col) => col.notNull())
    .addColumn('default_features', 'text', (col) => col.notNull())
    .addColumn('default_ui_settings', 'text', (col) => col.notNull())
    .addColumn('created_at', 'text', (col) => col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
    .addColumn('updated_at', 'text', (col) => col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
    .execute()

  await database.schema
    .createTable('tenants')
    .ifNotExists()
    .addColumn('id', 'integer', (col) => col.primaryKey().autoIncrement())
    .addColumn('code', 'integer', (col) => col.notNull().unique())
    .addColumn('slug', 'text', (col) => col.notNull().unique())
    .addColumn('name', 'text', (col) => col.notNull())
    .addColumn('status', 'text', (col) => col.notNull().defaultTo('active'))
    .addColumn('industry_id', 'integer')
    .addColumn('db_type', 'text', (col) => col.notNull().defaultTo('mariadb'))
    .addColumn('db_host', 'text', (col) => col.notNull())
    .addColumn('db_port', 'integer', (col) => col.notNull())
    .addColumn('db_name', 'text', (col) => col.notNull())
    .addColumn('db_user', 'text', (col) => col.notNull())
    .addColumn('db_secret_ref', 'text', (col) => col.notNull())
    .addColumn('payload_settings', 'text', (col) => col.notNull())
    .addColumn('created_at', 'text', (col) => col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
    .addColumn('updated_at', 'text', (col) => col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
    .addColumn('deleted_at', 'text')
    .execute()

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

  await database.schema
    .createTable('queue_jobs')
    .ifNotExists()
    .addColumn('id', 'integer', (col) => col.primaryKey().autoIncrement())
    .addColumn('type', 'text', (col) => col.notNull())
    .addColumn('payload', 'text', (col) => col.notNull())
    .addColumn('status', 'text', (col) => col.notNull().defaultTo('pending'))
    .addColumn('attempts', 'integer', (col) => col.notNull().defaultTo(0))
    .addColumn('run_at', 'text', (col) => col.notNull())
    .addColumn('created_at', 'text', (col) => col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
    .addColumn('updated_at', 'text', (col) => col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
    .execute()

  await seedSiteContent(database)
  await seedPlatformContent(database)
}

async function seedSiteContent(database: Kysely<DatabaseSchema>) {
  const { count } = await database
    .selectFrom('site_pages')
    .select((eb) => eb.fn.count<number>('id').as('count'))
    .executeTakeFirstOrThrow()

  if (Number(count) > 0) {
    return
  }

  await database
    .insertInto('site_pages')
    .values([
      {
        slug: 'home',
        nav_label: 'Home',
        title: 'One operating layer for commerce, ERP, and tenants.',
        eyebrow: 'CXSun Platform',
        summary:
          'CXSun unifies order flow, inventory visibility, financial approvals, and tenant operations in one workspace.',
        body:
          'Start with a focused operating dashboard today and grow into modular ERP and ecommerce workflows as the platform expands.',
        sort_order: 1,
      },
      {
        slug: 'about',
        nav_label: 'About',
        title: 'Built for teams that run complex commerce operations.',
        eyebrow: 'About',
        summary:
          'CXSun is shaped for operators who need clear workflows across branches, channels, and tenant boundaries.',
        body:
          'The platform keeps the server as the source of truth while clients stay fast, focused, and easy to evolve.',
        sort_order: 2,
      },
      {
        slug: 'services',
        nav_label: 'Services',
        title: 'Modular services for daily operating control.',
        eyebrow: 'Services',
        summary:
          'Coordinate commerce, inventory, finance, tenant administration, and reporting from a common data foundation.',
        body:
          'Each service area can grow as an independent module while sharing contracts and platform infrastructure.',
        sort_order: 3,
      },
      {
        slug: 'contact',
        nav_label: 'Contact',
        title: 'Talk through your operating model.',
        eyebrow: 'Contact',
        summary:
          'Use the contact channel to capture implementation needs, integrations, and tenant rollout questions.',
        body:
          'The current contact form writes to the local SQLite database so the full request path is already wired.',
        sort_order: 4,
      },
      {
        slug: 'blog',
        nav_label: 'Blog',
        title: 'Notes from the product floor.',
        eyebrow: 'Blog',
        summary:
          'Follow platform updates, architecture decisions, and operating patterns as the product grows.',
        body:
          'Blog content is seeded through the same local database connection used by the rest of the landing surface.',
        sort_order: 5,
      },
    ])
    .execute()

  await database
    .insertInto('site_services')
    .values([
      {
        title: 'ERP Core',
        description: 'Centralize approvals, stock movement, branch activity, and operational records.',
        sort_order: 1,
      },
      {
        title: 'Ecommerce Operations',
        description: 'Track channel orders, catalog sync, payment capture, and fulfillment status.',
        sort_order: 2,
      },
      {
        title: 'Tenant Control',
        description: 'Prepare tenant boundaries, workspace context, and future isolation rules.',
        sort_order: 3,
      },
    ])
    .execute()

  await database
    .insertInto('site_posts')
    .values([
      {
        title: 'Why CXSun starts with the operating layer',
        excerpt: 'A practical note on giving teams one place to see commerce, finance, and fulfillment work.',
        published_at: '2026-05-14',
        sort_order: 1,
      },
      {
        title: 'Designing modules before the database gets crowded',
        excerpt: 'How bounded contexts keep ERP and ecommerce features from tangling too early.',
        published_at: '2026-05-14',
        sort_order: 2,
      },
    ])
    .execute()
}

async function seedPlatformContent(database: Kysely<DatabaseSchema>) {
  const commerceIndustryId = await ensureIndustry(database, {
    code: 'commerce',
    name: 'Commerce',
    payload_schema: JSON.stringify({
      customer: ['gstin', 'billingAddress', 'shippingAddress'],
      transaction: ['channel', 'paymentMode', 'taxRegion'],
    }),
    default_features: JSON.stringify(['company.manage', 'orders.basic', 'inventory.basic']),
    default_ui_settings: JSON.stringify({
      accent: 'emerald',
      terminology: { company: 'Company', transaction: 'Transaction' },
    }),
  })

  const tenants = [
    { code: 100, slug: 'tenant_1', name: 'Tenant 1', industry_id: commerceIndustryId },
    { code: 101, slug: 'tenant_2', name: 'Tenant 2', industry_id: commerceIndustryId },
    { code: 102, slug: 'tenant_3', name: 'Tenant 3', industry_id: commerceIndustryId },
  ]

  for (const tenant of tenants) {
    await ensureTenant(database, tenant)
  }

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

  await ensureUserWithTenant(database, {
    name: 'Tenant 1 Admin',
    email: 'tenant_1@sundar.com',
    password: 'Sundar@123',
    tenantSlug: 'tenant_1',
    role: 'tenant-admin',
  })
  await ensureUserWithTenant(database, {
    name: 'Tenant 2 Admin',
    email: 'tenant_2@sundar.com',
    password: 'Sundar@123',
    tenantSlug: 'tenant_2',
    role: 'tenant-admin',
  })
  await ensureUserWithTenant(database, {
    name: 'Tenant 1 User 1',
    email: 'user_1@tenant_1.com',
    password: 'User@123',
    tenantSlug: 'tenant_1',
    role: 'tenant-user',
  })
  await ensureUserWithTenant(database, {
    name: 'Tenant 1 User 2',
    email: 'user_2@tenant_1.com',
    password: 'User@123',
    tenantSlug: 'tenant_1',
    role: 'tenant-user',
  })
}

async function ensureIndustry(
  database: Kysely<DatabaseSchema>,
  data: {
    code: string
    name: string
    payload_schema: string
    default_features: string
    default_ui_settings: string
  },
) {
  const existing = await database
    .selectFrom('industries')
    .select('id')
    .where('code', '=', data.code)
    .executeTakeFirst()

  if (existing) {
    await database
      .updateTable('industries')
      .set({ ...data, updated_at: new Date().toISOString() })
      .where('id', '=', existing.id)
      .execute()
    return existing.id
  }

  await database.insertInto('industries').values(data).execute()

  const created = await database
    .selectFrom('industries')
    .select('id')
    .where('code', '=', data.code)
    .executeTakeFirstOrThrow()

  return created.id
}

async function ensureTenant(
  database: Kysely<DatabaseSchema>,
  data: { code: number; slug: string; name: string; industry_id: number },
) {
  const existing = await database
    .selectFrom('tenants')
    .select('id')
    .where((eb) => eb.or([
      eb('slug', '=', data.slug),
      eb('code', '=', data.code),
    ]))
    .executeTakeFirst()

  const row = {
    ...data,
    status: 'active',
    db_type: 'mariadb',
    db_host: process.env.MARIADB_HOST ?? '127.0.0.1',
    db_port: Number(process.env.MARIADB_PORT ?? 3306),
    db_name: data.slug,
    db_user: process.env.MARIADB_USER ?? 'root',
    db_secret_ref: 'MARIADB_ROOT_PASSWORD',
    payload_settings: JSON.stringify({ ui: { density: 'comfortable' }, features: ['company.manage'] }),
    updated_at: new Date().toISOString(),
  }

  if (existing) {
    await database.updateTable('tenants').set(row).where('id', '=', existing.id).execute()
    return
  }

  await database.insertInto('tenants').values(row).execute()
}

async function ensurePolicy(
  database: Kysely<DatabaseSchema>,
  data: { code: string; name: string; description: string },
) {
  const existing = await database
    .selectFrom('rbac_policies')
    .select('id')
    .where('code', '=', data.code)
    .executeTakeFirst()

  if (existing) {
    return
  }

  await database.insertInto('rbac_policies').values(data).execute()
}

async function ensureTenantPolicy(
  database: Kysely<DatabaseSchema>,
  tenantId: number,
  policyCode: string,
) {
  const existing = await database
    .selectFrom('tenant_rbac_policies')
    .select('id')
    .where('tenant_id', '=', tenantId)
    .where('policy_code', '=', policyCode)
    .executeTakeFirst()

  if (existing) {
    await database
      .updateTable('tenant_rbac_policies')
      .set({ enabled: 1, updated_at: new Date().toISOString() })
      .where('id', '=', existing.id)
      .execute()
    return
  }

  await database
    .insertInto('tenant_rbac_policies')
    .values({ tenant_id: tenantId, policy_code: policyCode, enabled: 1 })
    .execute()
}

async function ensureUser(
  database: Kysely<DatabaseSchema>,
  data: { name: string; email: string; password: string },
) {
  const existing = await database
    .selectFrom('users')
    .select('id')
    .where('email', '=', data.email)
    .executeTakeFirst()

  const row = {
    name: data.name,
    email: data.email,
    password_hash: hashPassword(data.password),
    status: 'active',
    updated_at: new Date().toISOString(),
  }

  if (existing) {
    await database.updateTable('users').set(row).where('id', '=', existing.id).execute()
    return existing.id
  }

  await database.insertInto('users').values(row).execute()

  const created = await database
    .selectFrom('users')
    .select('id')
    .where('email', '=', data.email)
    .executeTakeFirstOrThrow()

  return created.id
}

async function ensureUserWithTenant(
  database: Kysely<DatabaseSchema>,
  data: { name: string; email: string; password: string; tenantSlug: string; role: string },
) {
  const userId = await ensureUser(database, data)
  const tenant = await database
    .selectFrom('tenants')
    .select('id')
    .where('slug', '=', data.tenantSlug)
    .executeTakeFirstOrThrow()

  await ensureUserTenant(database, userId, tenant.id, data.role)
}

async function ensureUserTenant(
  database: Kysely<DatabaseSchema>,
  userId: number,
  tenantId: number,
  role: string,
) {
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
