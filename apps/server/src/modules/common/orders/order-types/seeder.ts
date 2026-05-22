import type { Kysely } from 'kysely'
import type { TenantDatabaseSchema } from '../../../../infrastructure/tenant-database/tenant-database.schema.js'
import { seedMasterRecordDefinition } from '../../../foundation/master-record/database/seeders/master-record.seeder.js'
import { orderTypesCommonDefinition } from './definition.js'

const orderTypesSeedRows = [
  { name: '-' },
  { name: 'Sales Order' },
  { name: 'Purchase Order' },
  { name: 'Quotation' },
  { name: 'Proforma Invoice' },
  { name: 'Delivery Challan' },
  { name: 'Sales Return' },
  { name: 'Purchase Return' },
]

export function seedOrderTypesCommonTable(database: Kysely<TenantDatabaseSchema>) {
  return seedMasterRecordDefinition(database, orderTypesCommonDefinition, orderTypesSeedRows)
}
