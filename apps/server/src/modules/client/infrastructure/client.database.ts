import { sql } from 'kysely'
import { nowIso, type PlatformDatabaseModule } from '../../../infrastructure/database/database-module.js'

export const clientDatabaseModule: PlatformDatabaseModule = {
  name: 'client',
  async migrate(database) {
    await database.schema
      .createTable('clients')
      .ifNotExists()
      .addColumn('id', 'integer', (col) => col.primaryKey().autoIncrement())
      .addColumn('name', 'text', (col) => col.notNull())
      .addColumn('company_name', 'text')
      .addColumn('category', 'text')
      .addColumn('source', 'text')
      .addColumn('phone', 'text')
      .addColumn('email', 'text')
      .addColumn('location', 'text')
      .addColumn('notes', 'text', (col) => col.notNull())
      .addColumn('status', 'text', (col) => col.notNull().defaultTo('active'))
      .addColumn('created_at', 'text', (col) => col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
      .addColumn('updated_at', 'text', (col) => col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
      .addColumn('deleted_at', 'text')
      .execute()
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
