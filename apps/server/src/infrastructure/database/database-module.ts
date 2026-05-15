import { sql, type Kysely } from 'kysely'
import type { DatabaseSchema } from './schema.js'

export type PlatformDatabase = Kysely<DatabaseSchema>

export interface PlatformDatabaseModule {
  name: string
  migrate(database: PlatformDatabase): Promise<void>
  seed?(database: PlatformDatabase): Promise<void>
}

export async function addSqliteColumnIfMissing(
  database: PlatformDatabase,
  table: string,
  column: string,
  definition: string,
) {
  const columns = await sql<{ name: string }>`PRAGMA table_info(${sql.raw(table)})`.execute(database)
  const exists = columns.rows.some((row) => row.name === column)

  if (!exists) {
    await sql`ALTER TABLE ${sql.raw(table)} ADD COLUMN ${sql.raw(column)} ${sql.raw(definition)}`.execute(database)
  }
}

export function nowIso() {
  return new Date().toISOString()
}
