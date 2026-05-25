import { sql, type Kysely } from 'kysely'
import type { TenantDatabaseSchema } from '../../../../../infrastructure/tenant-database/tenant-database.schema.js'
import type { MasterDataColumnDefinition, MasterDataModuleDefinition } from '../../domain/value-objects/master-data-definition.js'
import { columnSqlType } from '../../infrastructure/persistence/master-record.repository.js'

type TenantDatabase = Kysely<TenantDatabaseSchema>

export const masterDataIdentityMigrationContract = {
  primaryKeyColumn: 'id',
  primaryKeyDefinition: 'INT NOT NULL AUTO_INCREMENT PRIMARY KEY',
  publicUuidColumn: 'uuid',
  publicUuidDefinition: 'CHAR(8) NOT NULL UNIQUE',
  publicUuidLength: 8,
} as const

export async function migrateMasterRecordDefinitions(
  database: TenantDatabase,
  definitions: readonly MasterDataModuleDefinition[],
) {
  for (const definition of definitions) {
    await migrateMasterRecordDefinition(database, definition)
  }
}

export async function migrateMasterRecordDefinition(
  database: TenantDatabase,
  definition: MasterDataModuleDefinition,
) {
  const columns = definition.columns.map((column) => {
    const nullable = column.required || column.nullable === false ? 'NOT NULL' : 'NULL'
    const defaultValue = defaultSql(column)
    return `\`${column.key}\` ${columnSqlType(column)} ${nullable}${defaultValue}`
  })

  await sql.raw(`
    CREATE TABLE IF NOT EXISTS \`${definition.tableName}\` (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      uuid CHAR(8) NOT NULL UNIQUE,
      ${columns.join(',\n      ')},
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      deleted_at DATETIME NULL,
      UNIQUE KEY uk_${definition.tableName}_uuid (uuid),
      INDEX idx_${definition.tableName}_${definition.defaultSortKey} (${definition.defaultSortKey})
    )
  `).execute(database)

}

export { migrateMasterRecordDefinition as migrateMasterDataDefinition }

function defaultSql(column: MasterDataColumnDefinition) {
  if (column.type === 'boolean') return ' DEFAULT 0'
  if (column.type === 'number' && !column.required) return ' DEFAULT NULL'
  return ''
}
