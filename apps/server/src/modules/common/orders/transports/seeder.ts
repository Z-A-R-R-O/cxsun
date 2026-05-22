import type { Kysely } from 'kysely'
import type { TenantDatabaseSchema } from '../../../../infrastructure/tenant-database/tenant-database.schema.js'
import { seedMasterRecordDefinition } from '../../../foundation/master-record/database/seeders/master-record.seeder.js'
import { transportsCommonDefinition } from './definition.js'

const transportsSeedRows = [
  { name: '-' },
  { name: 'Own Vehicle' },
  { name: 'Customer Pickup' },
  { name: 'Courier' },
  { name: 'Road Transport' },
  { name: 'Rail Cargo' },
  { name: 'Air Cargo' },
  { name: 'Sea Cargo' },
  { name: 'Porter' },
  { name: 'Delhivery' },
  { name: 'Blue Dart' },
]

export function seedTransportsCommonTable(database: Kysely<TenantDatabaseSchema>) {
  return seedMasterRecordDefinition(database, transportsCommonDefinition, transportsSeedRows)
}
