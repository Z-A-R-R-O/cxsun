import { Kysely, MysqlDialect, sql } from 'kysely'
import { createPool, type PoolOptions } from 'mysql2'
import { createConnection } from 'mysql2/promise'
import type { DatabaseSchema } from './schema.js'
import { platformDatabaseModules } from './platform-modules.js'
import { dbConfig } from '../../framework/config/index.js'

let db: Kysely<DatabaseSchema> | null = null

export function getMasterDatabaseConfig() {
  return dbConfig.master
}

export function getDatabase() {
  if (db) {
    return db
  }

  const config = getMasterDatabaseConfig()

  db = new Kysely<DatabaseSchema>({
    dialect: new MysqlDialect({
      pool: createPool({
        ...config,
        connectionLimit: dbConfig.master.connectionLimit,
        timezone: 'Z',
      } satisfies PoolOptions),
    }),
  })

  return db
}

export async function initializeDatabase() {
  await ensureMasterDatabase()
  await migratePlatformDatabase()
  await seedPlatformDatabase()
}

export async function migratePlatformDatabase() {
  await ensureMasterDatabase()
  const database = getDatabase()

  for (const databaseModule of platformDatabaseModules) {
    await databaseModule.migrate(database)
  }
}

export async function seedPlatformDatabase() {
  await ensureMasterDatabase()
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
  const config = getMasterDatabaseConfig()
  const rootConnection = await createConnection({
    host: config.host,
    port: config.port,
    user: config.user,
    password: config.password,
    timezone: 'Z',
  })
  await rootConnection.query(`DROP DATABASE IF EXISTS \`${config.database}\``)
  await rootConnection.query(`CREATE DATABASE \`${config.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`)
  await rootConnection.end()
}

async function ensureMasterDatabase() {
  const config = getMasterDatabaseConfig()
  const rootConnection = await createConnection({
    host: config.host,
    port: config.port,
    user: config.user,
    password: config.password,
    timezone: 'Z',
  })
  await rootConnection.query(`CREATE DATABASE IF NOT EXISTS \`${config.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`)
  await rootConnection.end()
}

export async function dropPlatformTables() {
  const database = getDatabase()
  await sql`SET FOREIGN_KEY_CHECKS = 0`.execute(database)
  for (const table of [
    'queue_jobs',
    'tenant_rbac_policies',
    'rbac_policies',
    'user_tenants',
    'users',
    'clients',
    'tenant_domains',
    'tenants',
    'industries',
    'site_messages',
    'site_posts',
    'site_services',
    'site_pages',
  ]) {
    await sql.raw(`DROP TABLE IF EXISTS \`${table}\``).execute(database)
  }
  await sql`SET FOREIGN_KEY_CHECKS = 1`.execute(database)
}
