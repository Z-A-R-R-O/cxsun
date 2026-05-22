import type { Kysely } from 'kysely'
import type { TenantDatabaseSchema } from '../../../../infrastructure/tenant-database/tenant-database.schema.js'
import { seedMasterRecordDefinition } from '../../../foundation/master-record/database/seeders/master-record.seeder.js'
import { paymentTermsCommonDefinition } from './definition.js'

const paymentTermsSeedRows = [
  { name: '-' },
  { name: 'Due on Receipt' },
  { name: 'Net 7 Days' },
  { name: 'Net 15 Days' },
  { name: 'Net 30 Days' },
  { name: 'Net 45 Days' },
  { name: 'Advance Payment' },
  { name: 'Cash on Delivery' },
  { name: 'Milestone Billing' },
]

export function seedPaymentTermsCommonTable(database: Kysely<TenantDatabaseSchema>) {
  return seedMasterRecordDefinition(database, paymentTermsCommonDefinition, paymentTermsSeedRows)
}
