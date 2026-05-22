import type { Kysely } from 'kysely'
import type { TenantDatabaseSchema } from '../../../../infrastructure/tenant-database/tenant-database.schema.js'
import { seedMasterRecordDefinition } from '../../../foundation/master-record/database/seeders/master-record.seeder.js'
import { productCategoriesCommonDefinition } from './definition.js'

const productCategoriesSeedRows = [
  { name: '-' },
  { name: 'Textiles' },
  { name: 'Garments' },
  { name: 'Electronics' },
  { name: 'Stationery' },
  { name: 'Hardware' },
  { name: 'Food Products' },
  { name: 'Footwear' },
  { name: 'Accessories' },
]

export function seedProductCategoriesCommonTable(database: Kysely<TenantDatabaseSchema>) {
  return seedMasterRecordDefinition(database, productCategoriesCommonDefinition, productCategoriesSeedRows)
}
