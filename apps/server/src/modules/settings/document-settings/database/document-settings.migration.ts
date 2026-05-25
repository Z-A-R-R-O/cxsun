import { sql } from 'kysely'
import type { TenantDatabase } from '../../../../infrastructure/tenant-database/tenant-database.types.js'

export async function migrateDocumentSettingsTables(database: TenantDatabase) {
  await database.schema
    .createTable('document_number_settings')
    .ifNotExists()
    .addColumn('id', 'integer', (col) => col.primaryKey().autoIncrement())
    .addColumn('uuid', 'char(8)')
    .addColumn('company_id', 'integer', (col) => col.notNull())
    .addColumn('accounting_year_id', 'integer', (col) => col.notNull())
    .addColumn('entry_kind', 'varchar(40)', (col) => col.notNull())
    .addColumn('prefix', 'varchar(40)', (col) => col.notNull())
    .addColumn('prefix_enabled', 'boolean', (col) => col.notNull().defaultTo(true))
    .addColumn('separator', 'varchar(8)', (col) => col.notNull().defaultTo('-'))
    .addColumn('separator_enabled', 'boolean', (col) => col.notNull().defaultTo(true))
    .addColumn('suffix', 'varchar(40)', (col) => col.notNull().defaultTo(''))
    .addColumn('suffix_enabled', 'boolean', (col) => col.notNull().defaultTo(false))
    .addColumn('next_number', 'integer', (col) => col.notNull().defaultTo(1))
    .addColumn('padding', 'integer', (col) => col.notNull().defaultTo(4))
    .addColumn('auto_enabled', 'boolean', (col) => col.notNull().defaultTo(true))
    .addColumn('created_at', 'datetime', (col) => col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
    .addColumn('updated_at', 'datetime', (col) => col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
    .execute()

  try {
    await database.schema
      .createIndex('uq_document_number_settings_context_kind')
      .ifNotExists()
      .on('document_number_settings')
      .columns(['company_id', 'accounting_year_id', 'entry_kind'])
      .unique()
      .execute()
  } catch {
    // Existing tenant databases may already have this index.
  }
}
