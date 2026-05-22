import type { Kysely } from 'kysely'
import type { TenantDatabaseSchema } from '../../../../infrastructure/tenant-database/tenant-database.schema.js'
import { seedMasterRecordDefinition } from '../../../foundation/master-record/database/seeders/master-record.seeder.js'
import { unitsCommonDefinition } from './definition.js'

const unitsSeedRows = [
  { name: '-' },
  { name: 'Nos' },
  { name: 'Pcs' },
  { name: 'Kg' },
  { name: 'Gram' },
  { name: 'Meter' },
  { name: 'Litre' },
  { name: 'Box' },
  { name: 'Packet' },
  { name: 'Pair' },
  { name: 'Dozen' },
]

export function seedUnitsCommonTable(database: Kysely<TenantDatabaseSchema>) {
  return seedMasterRecordDefinition(database, unitsCommonDefinition, unitsSeedRows)
}
