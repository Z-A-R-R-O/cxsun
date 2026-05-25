import { type Kysely } from 'kysely'
import type { DatabaseSchema } from './schema.js'

export type PlatformDatabase = Kysely<DatabaseSchema>

export interface PlatformDatabaseModule {
  name: string
  migrate(database: PlatformDatabase): Promise<void>
  seed?(database: PlatformDatabase): Promise<void>
}

export function nowIso() {
  return new Date().toISOString().slice(0, 19).replace('T', ' ')
}
