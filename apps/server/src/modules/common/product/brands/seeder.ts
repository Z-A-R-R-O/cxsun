import type { Kysely } from 'kysely'
import type { TenantDatabaseSchema } from '../../../../infrastructure/tenant-database/tenant-database.schema.js'
import { seedMasterRecordDefinition } from '../../../foundation/master-record/database/seeders/master-record.seeder.js'
import { brandsCommonDefinition } from './definition.js'

const brandsSeedRows = [
  { name: '-' },
  { name: 'Aaran' },
  { name: 'Codexsun' },
  { name: 'Classic' },
  { name: 'Premium' },
  { name: 'Value' },
  { name: 'Urban' },
  { name: 'Elite' },
]

export function seedBrandsCommonTable(database: Kysely<TenantDatabaseSchema>) {
  return seedMasterRecordDefinition(database, brandsCommonDefinition, brandsSeedRows)
}
