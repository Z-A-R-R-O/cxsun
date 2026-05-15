import { sql } from 'kysely'
import type { PlatformDatabaseModule } from '../database/database-module.js'

export const queueDatabaseModule: PlatformDatabaseModule = {
  name: 'queue',
  async migrate(database) {
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
  },
}
