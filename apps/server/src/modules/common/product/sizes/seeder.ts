import type { Kysely } from 'kysely'
import type { TenantDatabaseSchema } from '../../../../infrastructure/tenant-database/tenant-database.schema.js'
import { seedMasterRecordDefinition } from '../../../foundation/master-record/database/seeders/master-record.seeder.js'
import { sizesCommonDefinition } from './definition.js'

const sizesSeedRows = [
  { name: '-' },
  { name: 'XS' },
  { name: 'S' },
  { name: 'M' },
  { name: 'L' },
  { name: 'XL' },
  { name: 'XXL' },
  { name: 'Free Size' },
  { name: '28' },
  { name: '30' },
  { name: '32' },
  { name: '34' },
  { name: '36' },
]

export function seedSizesCommonTable(database: Kysely<TenantDatabaseSchema>) {
  return seedMasterRecordDefinition(database, sizesCommonDefinition, sizesSeedRows)
}
