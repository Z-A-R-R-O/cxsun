import { sql } from 'kysely'
import type { PlatformDatabaseModule } from '../database/database-module.js'

export const queueDatabaseModule: PlatformDatabaseModule = {
  name: 'queue',
  async migrate(database) {
    await sql.raw(`
      CREATE TABLE IF NOT EXISTS queue_jobs (
        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        type VARCHAR(120) NOT NULL,
        payload LONGTEXT NOT NULL,
        status VARCHAR(32) NOT NULL DEFAULT 'pending',
        attempts INT NOT NULL DEFAULT 0,
        run_at DATETIME NOT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_queue_jobs_status_run_at (status, run_at)
      )
    `).execute(database)
  },
}
