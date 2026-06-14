export type AccountLedgerType = 'cash' | 'bank' | 'fixed_asset' | 'customer' | 'supplier' | 'sales' | 'purchase' | 'gst' | 'tds' | 'round_off' | 'discount'
export type AccountBookType = 'cash' | 'bank'
export type AccountEntryDirection = 'in' | 'out'
export type AccountGroupNature = 'asset' | 'liability' | 'equity' | 'income' | 'expense'
export type AccountNormalBalance = 'debit' | 'credit'
export type AccountVoucherType = 'opening' | 'contra' | 'receipt' | 'payment' | 'journal' | 'sales' | 'purchase' | 'debit_note' | 'credit_note' | 'gst_adjustment' | 'year_end'
export type AccountVoucherStatus = 'draft' | 'posted' | 'cancelled'

export interface AccountLedger {
  id: number
  uuid: string
  tenant_id: number
  company_id: number
  accounting_year_id: number
  path: string
  account_type: AccountLedgerType
  code: string
  name: string
  opening_balance: number
  current_balance: number
  status: string
  is_active: boolean | number
  created_at: Date | string
  updated_at: Date | string
  deleted_at: Date | string | null
}

export interface AccountBookComment {
  id: number
  uuid: string
  entry_id: number
  author_email: string
  body: string
  created_at: Date | string
}

export interface AccountBookActivity {
  id: number
  uuid: string
  entry_id: number
  activity_type: string
  actor_email: string
  message: string
  payload: string | null
  created_at: Date | string
}

export interface AccountBookEntry {
  id: number
  uuid: string
  tenant_id: number
  company_id: number
  accounting_year_id: number
  ledger_id: number
  book_type: AccountBookType
  voucher_no: string
  voucher_date: Date | string
  direction: AccountEntryDirection
  party_id: string | null
  party_name: string | null
  particulars: string | null
  narration: string | null
  reference_no: string | null
  source_module: string | null
  source_uuid: string | null
  amount: number
  balance_after: number
  status: string
  notes: string | null
  is_active: boolean | number
  created_at: Date | string
  updated_at: Date | string
  deleted_at: Date | string | null
  comments: AccountBookComment[]
  activities: AccountBookActivity[]
}

export interface AccountBookEntryInput {
  id?: number
  uuid?: string
  company_id?: number
  accounting_year_id?: number
  ledger_id?: number
  book_type?: AccountBookType
  voucher_no?: string
  voucher_date?: string
  direction?: AccountEntryDirection
  party_id?: string | null
  party_name?: string | null
  particulars?: string | null
  narration?: string | null
  reference_no?: string | null
  source_module?: string | null
  source_uuid?: string | null
  amount?: number
  status?: string
  notes?: string | null
  is_active?: boolean | number
}

export interface AccountLedgerInput {
  id?: number
  uuid?: string
  account_type?: AccountLedgerType
  code?: string | null
  group_id?: number | null
  name?: string | null
  opening_balance?: number | string | null
  status?: string | null
  is_active?: boolean | number
}

export interface AccountGroup {
  id: number
  uuid: string
  tenant_id: number
  company_id: number
  accounting_year_id: number
  parent_id: number | null
  path: string
  name: string
  system_key: string
  nature: AccountGroupNature
  normal_balance: AccountNormalBalance
  affects_gross_profit: boolean | number
  is_system: boolean | number
  is_active: boolean | number
  created_at: Date | string
  updated_at: Date | string
  deleted_at: Date | string | null
}

export interface AccountVoucherLine {
  id: number
  uuid: string
  voucher_id: number
  ledger_id: number
  ledger_name?: string | null
  debit_amount: number
  credit_amount: number
  line_narration: string | null
  bill_reference: string | null
  sort_order: number
  created_at: Date | string
}

export interface AccountVoucher {
  id: number
  uuid: string
  tenant_id: number
  company_id: number
  accounting_year_id: number
  voucher_type: AccountVoucherType
  voucher_no: string
  voucher_date: Date | string
  reference_no: string | null
  party_ledger_id: number | null
  source_module: string | null
  source_uuid: string | null
  status: AccountVoucherStatus
  narration: string | null
  posted_at: Date | string | null
  cancelled_at: Date | string | null
  created_by: string
  updated_by: string | null
  created_at: Date | string
  updated_at: Date | string
  deleted_at: Date | string | null
  lines: AccountVoucherLine[]
}

export interface AccountVoucherLineInput {
  id?: number
  uuid?: string
  ledger_id?: number
  debit_amount?: number | string | null
  credit_amount?: number | string | null
  line_narration?: string | null
  bill_reference?: string | null
  sort_order?: number
}

export interface AccountVoucherInput {
  id?: number
  uuid?: string
  voucher_type?: AccountVoucherType
  voucher_no?: string
  voucher_date?: string
  reference_no?: string | null
  party_ledger_id?: number | null
  source_module?: string | null
  source_uuid?: string | null
  status?: AccountVoucherStatus
  narration?: string | null
  lines?: AccountVoucherLineInput[]
}

export interface AccountLedgerStatementRow {
  posting_id: number
  posting_uuid: string
  posting_date: Date | string
  voucher_uuid: string
  voucher_no: string
  voucher_type: AccountVoucherType
  ledger_id: number
  ledger_name: string
  debit_amount: number
  credit_amount: number
  running_balance: number
  running_side: AccountNormalBalance
  narration: string | null
}

export interface AccountTrialBalanceRow {
  ledger_id: number
  ledger_uuid: string
  ledger_name: string
  group_name: string | null
  nature: AccountGroupNature | null
  debit_amount: number
  credit_amount: number
}

export interface AccountPostingBookRow {
  posting_id: number
  posting_uuid: string
  posting_date: Date | string
  voucher_uuid: string
  voucher_no: string
  voucher_type: AccountVoucherType
  source_module: string | null
  source_uuid: string | null
  ledger_id: number
  ledger_name: string
  debit_amount: number
  credit_amount: number
  balance_after: number
  narration: string | null
}
