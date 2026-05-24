import { sql, type Kysely } from 'kysely'
import type { DatabaseSchema } from './schema.js'

export type PlatformDatabase = Kysely<DatabaseSchema>

export interface PlatformDatabaseModule {
  name: string
  migrate(database: PlatformDatabase): Promise<void>
  seed?(database: PlatformDatabase): Promise<void>
}

export async function addMasterColumnIfMissing(
  database: PlatformDatabase,
  table: string,
  column: string,
  definition: string,
) {
  const existing = await sql<{ COLUMN_NAME: string }>`
    SELECT COLUMN_NAME
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = ${table}
      AND COLUMN_NAME = ${column}
  `.execute(database)

  if (existing.rows.length > 0) return

  await sql.raw(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${definition}`).execute(database)
}

export function nowIso() {
  return new Date().toISOString().slice(0, 19).replace('T', ' ')
}
