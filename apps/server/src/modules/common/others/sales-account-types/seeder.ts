import type { Kysely } from 'kysely'
import type { TenantDatabaseSchema } from '../../../../infrastructure/tenant-database/tenant-database.schema.js'
import { seedMasterRecordDefinition } from '../../../foundation/master-record/database/seeders/master-record.seeder.js'
import { salesAccountTypesCommonDefinition } from './definition.js'

const salesAccountTypesSeedRows = [
  { name: 'Sales Account', description: 'Default normal sales ledger.' },
]

export function seedSalesAccountTypesCommonTable(database: Kysely<TenantDatabaseSchema>) {
  return seedMasterRecordDefinition(database, salesAccountTypesCommonDefinition, salesAccountTypesSeedRows)
}
