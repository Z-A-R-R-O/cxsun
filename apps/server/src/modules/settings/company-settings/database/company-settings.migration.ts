import { sql } from 'kysely'
import type { TenantDatabase } from '../../../../infrastructure/tenant-database/tenant-database.types.js'

export async function migrateCompanySettingsTables(database: TenantDatabase) {
  await database.schema
    .createTable('company_settings')
    .ifNotExists()
    .addColumn('id', 'integer', (col) => col.primaryKey().autoIncrement())
    .addColumn('uuid', 'char(8)')
    .addColumn('company_id', 'integer', (col) => col.notNull())
    .addColumn('setting_key', 'varchar(80)', (col) => col.notNull())
    .addColumn('values_json', 'text', (col) => col.notNull())
    .addColumn('created_at', 'datetime', (col) => col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
    .addColumn('updated_at', 'datetime', (col) => col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
    .execute()

  try {
    await database.schema
      .createIndex('uq_company_settings_company_key')
      .ifNotExists()
      .on('company_settings')
      .columns(['company_id', 'setting_key'])
      .unique()
      .execute()
  } catch {
    // Existing tenant databases may already have this index.
  }
}

