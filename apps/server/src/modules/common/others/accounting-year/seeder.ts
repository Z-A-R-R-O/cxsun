import type { Kysely } from 'kysely'
import type { TenantDatabaseSchema } from '../../../../infrastructure/tenant-database/tenant-database.schema.js'
import { seedMasterRecordDefinition } from '../../../foundation/master-record/database/seeders/master-record.seeder.js'
import { accountingYearCommonDefinition } from './definition.js'

const accountingYearSeedRows = Array.from({ length: 16 }, (_, index) => financialYearSeed(2017 + index))

export async function seedAccountingYearCommonTable(database: Kysely<TenantDatabaseSchema>) {
  await seedMasterRecordDefinition(database, accountingYearCommonDefinition, accountingYearSeedRows)

  for (const row of accountingYearSeedRows) {
    await database
      .updateTable('accounting_years')
      .set({
        start_date: row.start_date,
        end_date: row.end_date,
        books_start: row.books_start,
        is_current_year: row.is_current_year,
      })
      .where('name', '=', row.name)
      .execute()
  }
}

function financialYearSeed(startYear: number) {
  const now = new Date()
  const currentFinancialYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1

  return {
    name: `FY ${startYear}-${String(startYear + 1).slice(-2)}`,
    start_date: `${startYear}-04-01`,
    end_date: `${startYear + 1}-03-31`,
    books_start: `${startYear}-04-01`,
    is_current_year: startYear === currentFinancialYear,
  }
}
