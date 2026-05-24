import type { Kysely } from 'kysely'
import type { TenantDatabaseSchema } from '../../../../infrastructure/tenant-database/tenant-database.schema.js'
import { seedMasterRecordDefinition } from '../../../foundation/master-record/database/seeders/master-record.seeder.js'
import { contactTypesCommonDefinition } from './definition.js'

const contactTypesSeedRows = [
  { name: '-' },
  { name: 'Customer' },
  { name: 'Supplier' },
  { name: 'Customer and Supplier' },
  { name: 'Vendor Customer' },
  { name: 'Transporter' },
  { name: 'Employee' },
  { name: 'Broker' },
  { name: 'Consultant' },
  { name: 'Bank' },
]

export function seedContactTypesCommonTable(database: Kysely<TenantDatabaseSchema>) {
  return seedMasterRecordDefinition(database, contactTypesCommonDefinition, contactTypesSeedRows)
}
