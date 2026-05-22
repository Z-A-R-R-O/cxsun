import type { Kysely } from 'kysely'
import type { TenantDatabaseSchema } from '../../../../infrastructure/tenant-database/tenant-database.schema.js'
import { seedMasterRecordDefinition } from '../../../foundation/master-record/database/seeders/master-record.seeder.js'
import { accountingYearCommonDefinition } from './definition.js'

const accountingYearSeedRows = [
  { name: '-' },
  { name: '2024-2025' },
  { name: '2025-2026' },
  { name: '2026-2027' },
  { name: '2027-2028' },
]

export function seedAccountingYearCommonTable(database: Kysely<TenantDatabaseSchema>) {
  return seedMasterRecordDefinition(database, accountingYearCommonDefinition, accountingYearSeedRows)
}
