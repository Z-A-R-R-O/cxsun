import type { Kysely } from 'kysely'
import type { TenantDatabaseSchema } from '../../../../infrastructure/tenant-database/tenant-database.schema.js'
import { seedMasterRecordDefinition } from '../../../foundation/master-record/database/seeders/master-record.seeder.js'
import { productTypesCommonDefinition } from './definition.js'

const productTypesSeedRows = [
  { name: '-' },
  { name: 'Stock Item' },
  { name: 'Service Item' },
  { name: 'Non Stock Item' },
  { name: 'Bundle' },
  { name: 'Raw Material' },
  { name: 'Semi Finished' },
  { name: 'Finished Product' },
]

export function seedProductTypesCommonTable(database: Kysely<TenantDatabaseSchema>) {
  return seedMasterRecordDefinition(database, productTypesCommonDefinition, productTypesSeedRows)
}
