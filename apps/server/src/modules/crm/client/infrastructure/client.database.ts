import { sql } from 'kysely'
import { nowIso, type PlatformDatabaseModule } from '../../../../infrastructure/database/database-module.js'

export const clientDatabaseModule: PlatformDatabaseModule = {
  name: 'client',
  async migrate(database) {
    await sql.raw(`
      CREATE TABLE IF NOT EXISTS clients (
        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(191) NOT NULL,
        company_name VARCHAR(191) NULL,
        category VARCHAR(80) NULL,
        source VARCHAR(80) NULL,
        phone VARCHAR(80) NULL,
        email VARCHAR(191) NULL,
        location VARCHAR(191) NULL,
        notes TEXT NOT NULL,
        status VARCHAR(32) NOT NULL DEFAULT 'active',
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        deleted_at DATETIME NULL,
        INDEX idx_clients_name_category (name, category)
      )
    `).execute(database)
  },
  async seed(database) {
    const clients = [
      {
        name: 'Future client reminder',
        company_name: null,
        category: 'scratch',
        source: 'memory',
        phone: null,
        email: null,
        location: null,
        notes: 'Use this independent client manager to record people, leads, memories, and loose business notes without linking to tenants or companies.',
      },
    ]

    for (const client of clients) {
      const existing = await database
        .selectFrom('clients')
        .select('id')
        .where('name', '=', client.name)
        .where('category', '=', client.category)
        .executeTakeFirst()

      const row = { ...client, status: 'active', deleted_at: null, updated_at: nowIso() }

      if (existing) {
        await database.updateTable('clients').set(row).where('id', '=', existing.id).execute()
      } else {
        await database.insertInto('clients').values(row).execute()
      }
    }
  },
}
