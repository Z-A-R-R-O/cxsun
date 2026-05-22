import type { Kysely } from 'kysely'
import type { TenantDatabaseSchema } from '../../../../infrastructure/tenant-database/tenant-database.schema.js'
import { seedMasterRecordDefinition } from '../../../foundation/master-record/database/seeders/master-record.seeder.js'
import { destinationsCommonDefinition } from './definition.js'

const destinationsSeedRows = [
  { name: '-' },
  { name: 'Local Delivery' },
  { name: 'Tiruppur' },
  { name: 'Coimbatore' },
  { name: 'Chennai' },
  { name: 'Bengaluru' },
  { name: 'Mumbai' },
  { name: 'Delhi' },
  { name: 'Hyderabad' },
]

export function seedDestinationsCommonTable(database: Kysely<TenantDatabaseSchema>) {
  return seedMasterRecordDefinition(database, destinationsCommonDefinition, destinationsSeedRows)
}
