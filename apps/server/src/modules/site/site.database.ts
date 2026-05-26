import { sql } from 'kysely'
import type { PlatformDatabaseModule } from '../../infrastructure/database/database-module.js'

export const siteDatabaseModule: PlatformDatabaseModule = {
  name: 'site',
  async migrate(database) {
    await sql.raw(`
      CREATE TABLE IF NOT EXISTS site_pages (
        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        slug VARCHAR(191) NOT NULL UNIQUE,
        nav_label VARCHAR(191) NOT NULL,
        title VARCHAR(255) NOT NULL,
        eyebrow VARCHAR(191) NOT NULL,
        summary TEXT NOT NULL,
        body TEXT NOT NULL,
        sort_order INT NOT NULL
      )
    `).execute(database)

    await sql.raw(`
      CREATE TABLE IF NOT EXISTS site_services (
        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        sort_order INT NOT NULL
      )
    `).execute(database)

    await sql.raw(`
      CREATE TABLE IF NOT EXISTS site_posts (
        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        excerpt TEXT NOT NULL,
        published_at VARCHAR(40) NOT NULL,
        sort_order INT NOT NULL
      )
    `).execute(database)

    await sql.raw(`
      CREATE TABLE IF NOT EXISTS site_messages (
        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        tenant_id INT NULL,
        tenant_slug VARCHAR(80) NULL,
        domain VARCHAR(191) NULL,
        name VARCHAR(191) NOT NULL,
        email VARCHAR(191) NOT NULL,
        message TEXT NOT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `).execute(database)

    await sql.raw(`ALTER TABLE site_messages ADD COLUMN IF NOT EXISTS tenant_id INT NULL`).execute(database)
    await sql.raw(`ALTER TABLE site_messages ADD COLUMN IF NOT EXISTS tenant_slug VARCHAR(80) NULL`).execute(database)
    await sql.raw(`ALTER TABLE site_messages ADD COLUMN IF NOT EXISTS domain VARCHAR(191) NULL`).execute(database)
    await sql.raw(`CREATE INDEX IF NOT EXISTS idx_site_messages_tenant ON site_messages (tenant_id, created_at)`).execute(database)
    await sql.raw(`CREATE INDEX IF NOT EXISTS idx_site_messages_domain ON site_messages (domain, created_at)`).execute(database)
  },
  async seed(database) {
    const { count } = await database
      .selectFrom('site_pages')
      .select((eb) => eb.fn.count<number>('id').as('count'))
      .executeTakeFirstOrThrow()

    if (Number(count) > 0) return

    await database.insertInto('site_pages').values([
      {
        slug: 'home',
        nav_label: 'Home',
        title: 'One operating layer for commerce, ERP, and tenants.',
        eyebrow: 'CXSun Platform',
        summary: 'CXSun unifies order flow, inventory visibility, financial approvals, and tenant operations in one workspace.',
        body: 'Start with a focused operating dashboard today and grow into modular ERP and ecommerce workflows as the platform expands.',
        sort_order: 1,
      },
      {
        slug: 'about',
        nav_label: 'About',
        title: 'Built for teams that run complex commerce operations.',
        eyebrow: 'About',
        summary: 'CXSun is shaped for operators who need clear workflows across branches, channels, and tenant boundaries.',
        body: 'The platform keeps the server as the source of truth while clients stay fast, focused, and easy to evolve.',
        sort_order: 2,
      },
      {
        slug: 'services',
        nav_label: 'Services',
        title: 'Modular services for daily operating control.',
        eyebrow: 'Services',
        summary: 'Coordinate commerce, inventory, finance, tenant administration, and reporting from a common data foundation.',
        body: 'Each service area can grow as an independent module while sharing contracts and platform infrastructure.',
        sort_order: 3,
      },
      {
        slug: 'contact',
        nav_label: 'Contact',
        title: 'Talk through your operating model.',
        eyebrow: 'Contact',
        summary: 'Use the contact channel to capture implementation needs, integrations, and tenant rollout questions.',
        body: 'The current contact form writes to the local SQLite database so the full request path is already wired.',
        sort_order: 4,
      },
      {
        slug: 'blog',
        nav_label: 'Blog',
        title: 'Notes from the product floor.',
        eyebrow: 'Blog',
        summary: 'Follow platform updates, architecture decisions, and operating patterns as the product grows.',
        body: 'Blog content is seeded through the same local database connection used by the rest of the landing surface.',
        sort_order: 5,
      },
    ]).execute()

    await database.insertInto('site_services').values([
      { title: 'ERP Core', description: 'Centralize approvals, stock movement, branch activity, and operational records.', sort_order: 1 },
      { title: 'Ecommerce Operations', description: 'Track channel orders, catalog sync, payment capture, and fulfillment status.', sort_order: 2 },
      { title: 'Tenant Control', description: 'Prepare tenant boundaries, workspace context, and future isolation rules.', sort_order: 3 },
    ]).execute()

    await database.insertInto('site_posts').values([
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
    ]).execute()
  },
}
