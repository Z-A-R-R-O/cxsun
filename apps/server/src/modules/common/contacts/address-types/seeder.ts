import type { Kysely } from 'kysely'
import type { TenantDatabaseSchema } from '../../../../infrastructure/tenant-database/tenant-database.schema.js'
import { seedMasterRecordDefinition } from '../../../foundation/master-record/database/seeders/master-record.seeder.js'
import { addressTypesCommonDefinition } from './definition.js'

const addressTypesSeedRows = [
  { name: '-' },
  { name: 'Billing' },
  { name: 'Shipping' },
  { name: 'Registered Office' },
  { name: 'Branch Office' },
  { name: 'Warehouse' },
  { name: 'Factory' },
  { name: 'Home' },
  { name: 'Work' },
]

export function seedAddressTypesCommonTable(database: Kysely<TenantDatabaseSchema>) {
  return seedMasterRecordDefinition(database, addressTypesCommonDefinition, addressTypesSeedRows)
}
