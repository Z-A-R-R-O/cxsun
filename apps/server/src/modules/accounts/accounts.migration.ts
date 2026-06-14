import { sql, type Kysely } from 'kysely'
import { migrateEntryPostingControlTables } from '../entries/shared/entry-posting-control.service.js'

type DynamicDatabase = Record<string, Record<string, unknown>>

export async function migrateAccountsTables(database: Kysely<DynamicDatabase>) {
  await sql`
    CREATE TABLE IF NOT EXISTS account_ledgers (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      uuid VARCHAR(80) NOT NULL,
      tenant_id BIGINT UNSIGNED NOT NULL,
      company_id BIGINT UNSIGNED NOT NULL,
      accounting_year_id BIGINT UNSIGNED NOT NULL,
      path VARCHAR(240) NOT NULL,
      account_type VARCHAR(40) NOT NULL,
      code VARCHAR(80) NOT NULL,
      name VARCHAR(180) NOT NULL,
      opening_balance DECIMAL(15, 2) NOT NULL DEFAULT 0,
      current_balance DECIMAL(15, 2) NOT NULL DEFAULT 0,
      status VARCHAR(40) NOT NULL DEFAULT 'active',
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      deleted_at DATETIME NULL,
      UNIQUE KEY uq_account_ledgers_tenant_path (tenant_id, path),
      INDEX idx_account_ledgers_type (tenant_id, account_type, is_active)
    )
  `.execute(database)

  await createBookTable(database, 'cash_books', 'uq_cash_books_context_no', 'idx_cash_books_ledger_date', 'idx_cash_books_date')
  await createBookTable(database, 'bank_books', 'uq_bank_books_context_no', 'idx_bank_books_ledger_date', 'idx_bank_books_date')
  await ensureBookColumns(database, 'cash_books')
  await ensureBookColumns(database, 'bank_books')
  await migrateEntryPostingControlTables(database)
  await createAccountingEngineTables(database)
  await sql`
    CREATE TABLE IF NOT EXISTS account_book_comments (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      uuid VARCHAR(80) NOT NULL,
      tenant_id BIGINT UNSIGNED NOT NULL,
      book_type VARCHAR(20) NOT NULL,
      entry_id BIGINT UNSIGNED NOT NULL,
      author_email VARCHAR(180) NOT NULL,
      body TEXT NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_account_book_comments_entry (tenant_id, book_type, entry_id, id)
    )
  `.execute(database)

  await sql`
    CREATE TABLE IF NOT EXISTS account_book_activities (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      uuid VARCHAR(80) NOT NULL,
      tenant_id BIGINT UNSIGNED NOT NULL,
      book_type VARCHAR(20) NOT NULL,
      entry_id BIGINT UNSIGNED NOT NULL,
      activity_type VARCHAR(40) NOT NULL,
      actor_email VARCHAR(180) NOT NULL,
      message TEXT NOT NULL,
      payload TEXT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_account_book_activities_entry (tenant_id, book_type, entry_id, id)
    )
  `.execute(database)

  const tables = await database.introspection.getTables()
  if (tables.some((table) => table.name === 'account_ledger_entries')) {
    await sql`
      INSERT IGNORE INTO cash_books (
        id, uuid, tenant_id, company_id, accounting_year_id, ledger_id, voucher_no, voucher_date,
      direction, party_name, narration, reference_no, amount, balance_after, status, notes,
        is_active, created_at, updated_at, deleted_at
      )
      SELECT
        id, uuid, tenant_id, company_id, accounting_year_id, ledger_id, voucher_no, voucher_date,
        direction, party_name, narration, reference_no, amount, balance_after, status, notes,
        is_active, created_at, updated_at, deleted_at
      FROM account_ledger_entries
      WHERE book_type = 'cash'
    `.execute(database)

    await sql`
      INSERT IGNORE INTO bank_books (
        id, uuid, tenant_id, company_id, accounting_year_id, ledger_id, voucher_no, voucher_date,
        direction, party_name, narration, reference_no, amount, balance_after, status, notes,
        is_active, created_at, updated_at, deleted_at
      )
      SELECT
        id, uuid, tenant_id, company_id, accounting_year_id, ledger_id, voucher_no, voucher_date,
        direction, party_name, narration, reference_no, amount, balance_after, status, notes,
        is_active, created_at, updated_at, deleted_at
      FROM account_ledger_entries
      WHERE book_type = 'bank'
    `.execute(database)
  }
}

async function createAccountingEngineTables(database: Kysely<DynamicDatabase>) {
  await sql`
    CREATE TABLE IF NOT EXISTS account_groups (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      uuid CHAR(8) NOT NULL UNIQUE,
      tenant_id BIGINT UNSIGNED NOT NULL,
      company_id BIGINT UNSIGNED NOT NULL,
      accounting_year_id BIGINT UNSIGNED NOT NULL,
      parent_id INT UNSIGNED NULL,
      path VARCHAR(240) NOT NULL,
      name VARCHAR(180) NOT NULL,
      system_key VARCHAR(120) NOT NULL,
      nature VARCHAR(40) NOT NULL,
      normal_balance VARCHAR(20) NOT NULL,
      affects_gross_profit BOOLEAN NOT NULL DEFAULT FALSE,
      is_system BOOLEAN NOT NULL DEFAULT FALSE,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      deleted_at DATETIME NULL,
      UNIQUE KEY uq_account_groups_context_key (tenant_id, company_id, accounting_year_id, system_key),
      UNIQUE KEY uq_account_groups_context_path (tenant_id, company_id, accounting_year_id, path),
      INDEX idx_account_groups_parent (tenant_id, company_id, accounting_year_id, parent_id),
      INDEX idx_account_groups_nature (tenant_id, company_id, accounting_year_id, nature)
    )
  `.execute(database)

  await addColumnIfMissing(database, 'account_ledgers', 'group_id', 'INT UNSIGNED NULL')
  await addColumnIfMissing(database, 'account_ledgers', 'ledger_type', 'VARCHAR(40) NULL')
  await addColumnIfMissing(database, 'account_ledgers', 'normal_balance', 'VARCHAR(20) NULL')
  await addColumnIfMissing(database, 'account_ledgers', 'opening_debit', 'DECIMAL(15, 2) NOT NULL DEFAULT 0')
  await addColumnIfMissing(database, 'account_ledgers', 'opening_credit', 'DECIMAL(15, 2) NOT NULL DEFAULT 0')
  await addColumnIfMissing(database, 'account_ledgers', 'display_name', 'VARCHAR(180) NULL')
  await addColumnIfMissing(database, 'account_ledgers', 'is_programmatic', 'BOOLEAN NOT NULL DEFAULT FALSE')

  await sql`
    CREATE TABLE IF NOT EXISTS account_vouchers (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      uuid CHAR(8) NOT NULL UNIQUE,
      tenant_id BIGINT UNSIGNED NOT NULL,
      company_id BIGINT UNSIGNED NOT NULL,
      accounting_year_id BIGINT UNSIGNED NOT NULL,
      voucher_type VARCHAR(40) NOT NULL,
      voucher_no VARCHAR(80) NOT NULL,
      voucher_date DATE NOT NULL,
      reference_no VARCHAR(120) NULL,
      party_ledger_id BIGINT UNSIGNED NULL,
      source_module VARCHAR(80) NULL,
      source_uuid CHAR(8) NULL,
      status VARCHAR(40) NOT NULL DEFAULT 'draft',
      narration TEXT NULL,
      posted_at DATETIME NULL,
      cancelled_at DATETIME NULL,
      created_by VARCHAR(180) NOT NULL,
      updated_by VARCHAR(180) NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      deleted_at DATETIME NULL,
      UNIQUE KEY uq_account_vouchers_context_no (tenant_id, company_id, accounting_year_id, voucher_type, voucher_no),
      INDEX idx_account_vouchers_date (tenant_id, company_id, accounting_year_id, voucher_date, id),
      INDEX idx_account_vouchers_source (tenant_id, source_module, source_uuid)
    )
  `.execute(database)

  await sql`
    CREATE TABLE IF NOT EXISTS account_voucher_lines (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      uuid CHAR(8) NOT NULL UNIQUE,
      voucher_id INT UNSIGNED NOT NULL,
      ledger_id BIGINT UNSIGNED NOT NULL,
      debit_amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
      credit_amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
      line_narration TEXT NULL,
      bill_reference VARCHAR(120) NULL,
      sort_order INT NOT NULL DEFAULT 0,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_account_voucher_lines_voucher (voucher_id, sort_order, id),
      INDEX idx_account_voucher_lines_ledger (ledger_id, id)
    )
  `.execute(database)

  await sql`
    CREATE TABLE IF NOT EXISTS account_postings (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      uuid CHAR(8) NOT NULL UNIQUE,
      tenant_id BIGINT UNSIGNED NOT NULL,
      company_id BIGINT UNSIGNED NOT NULL,
      accounting_year_id BIGINT UNSIGNED NOT NULL,
      voucher_id INT UNSIGNED NOT NULL,
      voucher_line_id INT UNSIGNED NOT NULL,
      ledger_id BIGINT UNSIGNED NOT NULL,
      posting_date DATE NOT NULL,
      debit_amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
      credit_amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
      source_module VARCHAR(80) NULL,
      source_uuid CHAR(8) NULL,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      reversal_of_posting_id INT UNSIGNED NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_account_postings_ledger_date (tenant_id, company_id, accounting_year_id, ledger_id, posting_date, id),
      INDEX idx_account_postings_voucher (voucher_id, voucher_line_id),
      INDEX idx_account_postings_source (tenant_id, source_module, source_uuid)
    )
  `.execute(database)

  await sql`
    CREATE TABLE IF NOT EXISTS account_posting_audits (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      uuid CHAR(8) NOT NULL UNIQUE,
      tenant_id BIGINT UNSIGNED NOT NULL,
      company_id BIGINT UNSIGNED NOT NULL,
      accounting_year_id BIGINT UNSIGNED NOT NULL,
      voucher_id INT UNSIGNED NULL,
      source_module VARCHAR(80) NOT NULL,
      source_uuid CHAR(8) NOT NULL,
      action VARCHAR(40) NOT NULL,
      actor_email VARCHAR(180) NOT NULL,
      debit_total DECIMAL(15, 2) NOT NULL DEFAULT 0,
      credit_total DECIMAL(15, 2) NOT NULL DEFAULT 0,
      line_count INT NOT NULL DEFAULT 0,
      summary TEXT NULL,
      payload JSON NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_account_posting_audits_source (tenant_id, source_module, source_uuid, id),
      INDEX idx_account_posting_audits_voucher (voucher_id, id)
    )
  `.execute(database)

  await sql`
    CREATE TABLE IF NOT EXISTS account_posting_rollups (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      uuid CHAR(8) NOT NULL UNIQUE,
      tenant_id BIGINT UNSIGNED NOT NULL,
      company_id BIGINT UNSIGNED NOT NULL,
      accounting_year_id BIGINT UNSIGNED NOT NULL,
      period_month CHAR(7) NOT NULL,
      source_module VARCHAR(80) NOT NULL,
      voucher_type VARCHAR(40) NOT NULL,
      ledger_id BIGINT UNSIGNED NULL,
      ledger_type VARCHAR(40) NULL,
      category VARCHAR(80) NULL,
      entry_count INT NOT NULL DEFAULT 0,
      voucher_count INT NOT NULL DEFAULT 0,
      debit_amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
      credit_amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
      taxable_amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
      tax_amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
      grand_amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_account_posting_rollups_bucket (tenant_id, company_id, accounting_year_id, period_month, source_module, voucher_type, ledger_id, category),
      INDEX idx_account_posting_rollups_month (tenant_id, company_id, accounting_year_id, period_month, source_module)
    )
  `.execute(database)

  await sql`
    CREATE TABLE IF NOT EXISTS account_posting_rebuild_runs (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      uuid CHAR(8) NOT NULL UNIQUE,
      tenant_id BIGINT UNSIGNED NOT NULL,
      company_id BIGINT UNSIGNED NOT NULL,
      accounting_year_id BIGINT UNSIGNED NOT NULL,
      status VARCHAR(40) NOT NULL DEFAULT 'completed',
      requested_by VARCHAR(180) NOT NULL,
      source_module VARCHAR(80) NULL,
      processed_count INT NOT NULL DEFAULT 0,
      message TEXT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      completed_at DATETIME NULL,
      INDEX idx_account_posting_rebuild_runs_context (tenant_id, company_id, accounting_year_id, id)
    )
  `.execute(database)
}

async function createBookTable(
  database: Kysely<DynamicDatabase>,
  tableName: string,
  uniqueKeyName: string,
  ledgerIndexName: string,
  dateIndexName: string,
) {
  await sql.raw(`
    CREATE TABLE IF NOT EXISTS ${tableName} (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      uuid VARCHAR(80) NOT NULL,
      tenant_id BIGINT UNSIGNED NOT NULL,
      company_id BIGINT UNSIGNED NOT NULL,
      accounting_year_id BIGINT UNSIGNED NOT NULL,
      ledger_id BIGINT UNSIGNED NOT NULL,
      voucher_no VARCHAR(80) NOT NULL,
      voucher_date DATE NOT NULL,
      direction VARCHAR(20) NOT NULL,
      party_id VARCHAR(80) NULL,
      party_name VARCHAR(220) NULL,
      particulars VARCHAR(220) NULL,
      narration TEXT NULL,
      reference_no VARCHAR(120) NULL,
      source_module VARCHAR(80) NULL,
      source_uuid VARCHAR(80) NULL,
      amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
      balance_after DECIMAL(15, 2) NOT NULL DEFAULT 0,
      status VARCHAR(40) NOT NULL DEFAULT 'draft',
      notes TEXT NULL,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      deleted_at DATETIME NULL,
      UNIQUE KEY ${uniqueKeyName} (tenant_id, company_id, accounting_year_id, voucher_no),
      INDEX ${ledgerIndexName} (ledger_id, voucher_date, id),
      INDEX ${dateIndexName} (tenant_id, voucher_date, id)
    )
  `).execute(database)
}

async function ensureBookColumns(database: Kysely<DynamicDatabase>, tableName: string) {
  await addColumnIfMissing(database, tableName, 'party_id', 'VARCHAR(80) NULL')
  await addColumnIfMissing(database, tableName, 'particulars', 'VARCHAR(220) NULL')
  await addColumnIfMissing(database, tableName, 'source_module', 'VARCHAR(80) NULL')
  await addColumnIfMissing(database, tableName, 'source_uuid', 'VARCHAR(80) NULL')
}

async function addColumnIfMissing(database: Kysely<DynamicDatabase>, tableName: string, columnName: string, definition: string) {
  const columns = await database.introspection.getTables()
  const table = columns.find((item) => item.name === tableName)
  if (table?.columns.some((column) => column.name === columnName)) return
  await sql.raw(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`).execute(database)
}
