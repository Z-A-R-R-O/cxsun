import type { Kysely } from 'kysely'
import type { TenantDatabaseSchema } from '../../../../infrastructure/tenant-database/tenant-database.schema.js'
import { seedMasterRecordDefinition } from '../../../foundation/master-record/database/seeders/master-record.seeder.js'
import { taxesCommonDefinition } from './definition.js'

const taxesSeedRows = [
  { rate_percent: 0, description: '-' },
  { rate_percent: 5, description: 'GST 5%' },
  { rate_percent: 12, description: 'GST 12%' },
  { rate_percent: 18, description: 'GST 18%' },
  { rate_percent: 28, description: 'GST 28%' },
]

export function seedTaxesCommonTable(database: Kysely<TenantDatabaseSchema>) {
  return seedMasterRecordDefinition(database, taxesCommonDefinition, taxesSeedRows)
}
