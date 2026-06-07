import { sql, type Kysely } from 'kysely'
import type { TenantDatabaseSchema } from '../../../../../infrastructure/tenant-database/tenant-database.schema.js'
import { migrateMasterDataDefinition } from '../../../../foundation/master-record/database/migrations/master-record.migration.js'
import { auditorClientDefinition } from '../../domain/value-objects/auditor-client.definition.js'

export async function migrateAuditorClientTable(database: Kysely<TenantDatabaseSchema>) {
  await migrateMasterDataDefinition(database, auditorClientDefinition)

  for (const column of auditorClientDefinition.columns.slice(2)) {
    await sql.raw(`ALTER TABLE \`${auditorClientDefinition.tableName}\` ADD COLUMN IF NOT EXISTS \`${column.key}\` VARCHAR(255) NULL`).execute(database)
  }
}
