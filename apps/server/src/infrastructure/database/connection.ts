import { mkdirSync, rmSync } from 'fs'
import { dirname, resolve } from 'path'
import { createRequire } from 'module'
import { Kysely, SqliteDialect } from 'kysely'
import type BetterSqlite3 from 'better-sqlite3'
import type { DatabaseSchema } from './schema.js'
import { platformDatabaseModules } from './platform-modules.js'

const require = createRequire(import.meta.url)
const Database = require('better-sqlite3') as typeof BetterSqlite3

export const platformDatabasePath = resolve(
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

  mkdirSync(dirname(platformDatabasePath), { recursive: true })

  db = new Kysely<DatabaseSchema>({
    dialect: new SqliteDialect({
      database: new Database(platformDatabasePath),
    }),
  })

  return db
}

export async function initializeDatabase() {
  await migratePlatformDatabase()
  await seedPlatformDatabase()
}

export async function migratePlatformDatabase() {
  const database = getDatabase()

  for (const databaseModule of platformDatabaseModules) {
    await databaseModule.migrate(database)
  }
}

export async function seedPlatformDatabase() {
  const database = getDatabase()

  for (const databaseModule of platformDatabaseModules) {
    await databaseModule.seed?.(database)
  }
}

export async function closeDatabase() {
  if (!db) {
    return
  }

  await db.destroy()
  db = null
}

export async function dropPlatformDatabase() {
  await closeDatabase()
  rmSync(platformDatabasePath, { force: true })
}
