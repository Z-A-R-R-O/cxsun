import type { Kysely } from 'kysely'
import type { TenantDatabaseSchema } from '../../../../infrastructure/tenant-database/tenant-database.schema.js'
import { seedMasterRecordDefinition } from '../../../foundation/master-record/database/seeders/master-record.seeder.js'
import { productGroupsCommonDefinition } from './definition.js'

const productGroupsSeedRows = [
  { name: '-' },
  { name: 'Finished Goods' },
  { name: 'Raw Materials' },
  { name: 'Trading Goods' },
  { name: 'Services' },
  { name: 'Consumables' },
  { name: 'Packaging Materials' },
  { name: 'Spare Parts' },
  { name: 'Assets' },
]

export function seedProductGroupsCommonTable(database: Kysely<TenantDatabaseSchema>) {
  return seedMasterRecordDefinition(database, productGroupsCommonDefinition, productGroupsSeedRows)
}
