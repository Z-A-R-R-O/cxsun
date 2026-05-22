import type { Kysely } from 'kysely'
import type { TenantDatabaseSchema } from '../../../../infrastructure/tenant-database/tenant-database.schema.js'
import { seedMasterRecordDefinition } from '../../../foundation/master-record/database/seeders/master-record.seeder.js'
import { stockRejectionTypesCommonDefinition } from './definition.js'

const stockRejectionTypesSeedRows = [
  { name: '-' },
  { name: 'Damaged' },
  { name: 'Short Quantity' },
  { name: 'Quality Issue' },
  { name: 'Wrong Item' },
  { name: 'Expired' },
  { name: 'Customer Return' },
  { name: 'Transport Damage' },
]

export function seedStockRejectionTypesCommonTable(database: Kysely<TenantDatabaseSchema>) {
  return seedMasterRecordDefinition(database, stockRejectionTypesCommonDefinition, stockRejectionTypesSeedRows)
}
