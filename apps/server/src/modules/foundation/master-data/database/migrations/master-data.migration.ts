import type { Kysely } from 'kysely'
import type { TenantDatabaseSchema } from '../../../../../infrastructure/tenant-database/tenant-database.schema.js'
import {
  masterDataIdentityMigrationContract,
  migrateMasterRecordDefinition,
  migrateMasterRecordDefinitions,
} from '../../../master-record/database/migrations/master-record.migration.js'
import { masterDataDefinitions } from '../../domain/value-objects/master-data-definition.js'

type TenantDatabase = Kysely<TenantDatabaseSchema>

export { masterDataIdentityMigrationContract, migrateMasterRecordDefinition as migrateMasterDataDefinition }

export function migrateMasterDataTables(database: TenantDatabase) {
  return migrateMasterRecordDefinitions(database, masterDataDefinitions)
}
