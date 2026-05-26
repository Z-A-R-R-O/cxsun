import { sql } from 'kysely'
import type { PlatformDatabaseModule } from '../database/database-module.js'

export const queueDatabaseModule: PlatformDatabaseModule = {
  name: 'queue',
  async migrate(database) {
    await sql.raw(`
      CREATE TABLE IF NOT EXISTS queue_jobs (
        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        queue_name VARCHAR(80) NOT NULL DEFAULT 'events',
        type VARCHAR(120) NOT NULL,
        payload LONGTEXT NOT NULL,
        status VARCHAR(32) NOT NULL DEFAULT 'pending',
        attempts INT NOT NULL DEFAULT 0,
        progress INT NOT NULL DEFAULT 0,
        result LONGTEXT NULL,
        error LONGTEXT NULL,
        run_at DATETIME NOT NULL,
        started_at DATETIME NULL,
        finished_at DATETIME NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_queue_jobs_status_run_at (status, run_at),
        INDEX idx_queue_jobs_queue_status (queue_name, status)
      )
    `).execute(database)

    await addColumnIfMissing(database, 'queue_jobs', 'queue_name', "VARCHAR(80) NOT NULL DEFAULT 'events' AFTER id")
    await addColumnIfMissing(database, 'queue_jobs', 'progress', 'INT NOT NULL DEFAULT 0 AFTER attempts')
    await addColumnIfMissing(database, 'queue_jobs', 'result', 'LONGTEXT NULL AFTER progress')
    await addColumnIfMissing(database, 'queue_jobs', 'error', 'LONGTEXT NULL AFTER result')
    await addColumnIfMissing(database, 'queue_jobs', 'started_at', 'DATETIME NULL AFTER run_at')
    await addColumnIfMissing(database, 'queue_jobs', 'finished_at', 'DATETIME NULL AFTER started_at')
    await addIndexIfMissing(database, 'queue_jobs', 'idx_queue_jobs_queue_status', 'INDEX idx_queue_jobs_queue_status (queue_name, status)')
  },
}

async function addColumnIfMissing(database: Parameters<PlatformDatabaseModule['migrate']>[0], table: string, column: string, definition: string) {
  const exists = await sql<{ count: number }>`
    SELECT COUNT(*) AS count
    FROM information_schema.columns
    WHERE table_schema = DATABASE()
      AND table_name = ${table}
      AND column_name = ${column}
  `.execute(database)

  if (Number(exists.rows[0]?.count ?? 0) === 0) {
    await sql.raw(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`).execute(database)
  }
}

async function addIndexIfMissing(database: Parameters<PlatformDatabaseModule['migrate']>[0], table: string, indexName: string, definition: string) {
  const exists = await sql<{ count: number }>`
    SELECT COUNT(*) AS count
    FROM information_schema.statistics
    WHERE table_schema = DATABASE()
      AND table_name = ${table}
      AND index_name = ${indexName}
  `.execute(database)

  if (Number(exists.rows[0]?.count ?? 0) === 0) {
    await sql.raw(`ALTER TABLE ${table} ADD ${definition}`).execute(database)
  }
}
