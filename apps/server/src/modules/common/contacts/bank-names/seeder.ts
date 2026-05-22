import type { Kysely } from 'kysely'
import type { TenantDatabaseSchema } from '../../../../infrastructure/tenant-database/tenant-database.schema.js'
import { seedMasterRecordDefinition } from '../../../foundation/master-record/database/seeders/master-record.seeder.js'
import { bankNamesCommonDefinition } from './definition.js'

const bankNamesSeedRows = [
  { name: '-' },
  { name: 'State Bank of India' },
  { name: 'HDFC Bank' },
  { name: 'ICICI Bank' },
  { name: 'Axis Bank' },
  { name: 'Indian Bank' },
  { name: 'Canara Bank' },
  { name: 'Bank of Baroda' },
  { name: 'Union Bank of India' },
  { name: 'Kotak Mahindra Bank' },
  { name: 'IDFC First Bank' },
]

export function seedBankNamesCommonTable(database: Kysely<TenantDatabaseSchema>) {
  return seedMasterRecordDefinition(database, bankNamesCommonDefinition, bankNamesSeedRows)
}
