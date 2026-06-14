import { apiBaseUrl, authHeaders, type AuthSession } from "src/features/auth/auth-client"

export type AccountBookType = "cash" | "bank"
export type AccountLedgerType = "cash" | "bank" | "fixed_asset" | "customer" | "supplier" | "sales" | "purchase" | "gst" | "tds" | "round_off" | "discount"
export type AccountEntryDirection = "in" | "out"
export type AccountGroupNature = "asset" | "liability" | "equity" | "income" | "expense"
export type AccountNormalBalance = "debit" | "credit"
export type AccountVoucherType = "opening" | "contra" | "receipt" | "payment" | "journal" | "sales" | "purchase" | "debit_note" | "credit_note" | "gst_adjustment" | "year_end"
export type AccountVoucherStatus = "draft" | "posted" | "cancelled"

export interface AccountLedger {
  id: number
  uuid: string
  path: string
  account_type: AccountLedgerType
  group_id?: number | null
  ledger_type?: string | null
  normal_balance?: AccountNormalBalance | null
  code: string
  name: string
  opening_balance: number
  opening_debit?: number
  opening_credit?: number
  current_balance: number
  status: string
  is_active: boolean | number
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

export interface AccountBookEntry {
  id: number
  uuid: string
  company_id: number
  accounting_year_id: number
  ledger_id: number
  book_type: AccountBookType
  voucher_no: string
  voucher_date: string
  direction: AccountEntryDirection
  party_id: string | null
  party_name: string | null
  particulars: string | null
  narration: string | null
  reference_no: string | null
  amount: number
  balance_after: number
  status: string
  notes: string | null
  is_active: boolean | number
  created_at: string
  updated_at: string
  deleted_at: string | null
  comments: AccountBookComment[]
  activities: AccountBookActivity[]
}

export interface AccountBookComment {
  id: number
  uuid: string
  entry_id: number
  author_email: string
  body: string
  created_at: string
}

export interface AccountBookActivity {
  id: number
  uuid: string
  entry_id: number
  activity_type: string
  actor_email: string
  message: string
  payload: string | null
  created_at: string
}

export interface AccountBookEntryInput {
  id?: number
  uuid?: string
  ledger_id?: number
  voucher_no?: string
  voucher_date?: string
  direction?: AccountEntryDirection
  party_id?: string | null
  party_name?: string | null
  particulars?: string | null
  narration?: string | null
  reference_no?: string | null
  amount?: number
  status?: string
  notes?: string | null
  is_active?: boolean | number
}

export interface AccountGroup {
  id: number
  uuid: string
  parent_id: number | null
  path: string
  name: string
  system_key: string
  nature: AccountGroupNature
  normal_balance: AccountNormalBalance
  affects_gross_profit: boolean | number
  is_system: boolean | number
  is_active: boolean | number
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
}

export interface AccountVoucher {
  id: number
  uuid: string
  voucher_type: AccountVoucherType
  voucher_no: string
  voucher_date: string
  reference_no: string | null
  party_ledger_id: number | null
  source_module: string | null
  source_uuid: string | null
  status: AccountVoucherStatus
  narration: string | null
  posted_at: string | null
  cancelled_at: string | null
  created_by: string
  updated_by: string | null
  created_at: string
  updated_at: string
  lines: AccountVoucherLine[]
}

export interface AccountVoucherLineInput {
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
  posting_date: string
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
  posting_date: string
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

export interface AccountSummaryReport {
  rows: AccountTrialBalanceRow[]
  totals: { debit_amount: number; credit_amount: number }
}

export interface AccountingPeriodLock {
  id: number
  uuid: string
  company_id: number | null
  accounting_year_id: number | null
  locked_from: string
  locked_to: string
  lock_type: string
  source: string | null
  reason: string | null
  is_active: boolean | number
  created_by: string
  released_by: string | null
  released_at: string | null
  created_at: string
  updated_at: string
}

export interface AccountingPeriodLockInput {
  company_id?: number | null
  accounting_year_id?: number | null
  locked_from?: string | null
  locked_to?: string | null
  lock_type?: string | null
  source?: string | null
  reason?: string | null
}

export function emptyAccountBookEntry(): AccountBookEntryInput {
  return {
    voucher_date: new Date().toISOString().slice(0, 10),
    direction: "in",
    party_id: null,
    party_name: "",
    particulars: "",
    narration: "",
    reference_no: "",
    amount: 0,
    status: "draft",
    notes: "",
    is_active: true,
  }
}

export async function listAccountLedgers(session: AuthSession, type: AccountBookType) {
  const response = await fetch(`${apiBaseUrl}/api/v1/accounts/ledgers/${type}`, {
    cache: "no-store",
    headers: authHeaders(session),
  })
  if (!response.ok) throw new Error(`Account ledger list failed with status ${response.status}.`)
  return (await response.json()) as AccountLedger[]
}

export async function listAllAccountLedgers(session: AuthSession) {
  const response = await fetch(`${apiBaseUrl}/api/v1/accounts/ledgers`, {
    cache: "no-store",
    headers: authHeaders(session),
  })
  if (!response.ok) throw new Error(`Account ledger list failed with status ${response.status}.`)
  return (await response.json()) as AccountLedger[]
}

export async function listAccountGroups(session: AuthSession) {
  const response = await fetch(`${apiBaseUrl}/api/v1/accounts/chart/groups`, {
    cache: "no-store",
    headers: authHeaders(session),
  })
  if (!response.ok) throw new Error(`Account group list failed with status ${response.status}.`)
  return (await response.json()) as AccountGroup[]
}

export async function listAccountVouchers(session: AuthSession) {
  const response = await fetch(`${apiBaseUrl}/api/v1/accounts/vouchers`, {
    cache: "no-store",
    headers: authHeaders(session),
  })
  if (!response.ok) throw new Error(`Account voucher list failed with status ${response.status}.`)
  return (await response.json()) as AccountVoucher[]
}

export async function upsertAccountVoucher(session: AuthSession, input: AccountVoucherInput) {
  const response = await fetch(`${apiBaseUrl}/api/v1/accounts/vouchers/upsert`, {
    body: JSON.stringify(input),
    cache: "no-store",
    headers: { ...authHeaders(session), "Content-Type": "application/json" },
    method: "POST",
  })
  if (!response.ok) throw new Error(`Account voucher save failed with status ${response.status}.`)
  const result = (await response.json()) as { ok: boolean; voucher?: AccountVoucher; error?: string }
  if (!result.ok || !result.voucher) throw new Error(result.error ?? "Account voucher save failed.")
  return result.voucher
}

export async function postAccountVoucher(session: AuthSession, voucher: AccountVoucher) {
  return accountVoucherAction(session, voucher, "post")
}

export async function cancelAccountVoucher(session: AuthSession, voucher: AccountVoucher) {
  return accountVoucherAction(session, voucher, "cancel")
}

export async function listAccountDayBook(session: AuthSession, accountingYearId?: number | null) {
  const response = await fetch(`${apiBaseUrl}/api/v1/accounts/reports/day-book${accountingYearQuery(accountingYearId)}`, {
    cache: "no-store",
    headers: authHeaders(session),
  })
  if (!response.ok) throw new Error(`Day book failed with status ${response.status}.`)
  return (await response.json()) as AccountVoucher[]
}

export async function listAccountPostingBook(session: AuthSession, bookType: AccountBookType, accountingYearId?: number | null) {
  const response = await fetch(`${apiBaseUrl}/api/v1/accounts/books/${bookType}${accountingYearQuery(accountingYearId)}`, {
    cache: "no-store",
    headers: authHeaders(session),
  })
  if (!response.ok) throw new Error(`${bookType === "cash" ? "Cash" : "Bank"} book failed with status ${response.status}.`)
  return (await response.json()) as AccountPostingBookRow[]
}

export async function listAccountTrialBalance(session: AuthSession, accountingYearId?: number | null) {
  const response = await fetch(`${apiBaseUrl}/api/v1/accounts/reports/trial-balance${accountingYearQuery(accountingYearId)}`, {
    cache: "no-store",
    headers: authHeaders(session),
  })
  if (!response.ok) throw new Error(`Trial balance failed with status ${response.status}.`)
  return (await response.json()) as AccountTrialBalanceRow[]
}

export async function listAccountProfitLoss(session: AuthSession, accountingYearId?: number | null) {
  const response = await fetch(`${apiBaseUrl}/api/v1/accounts/reports/profit-loss${accountingYearQuery(accountingYearId)}`, {
    cache: "no-store",
    headers: authHeaders(session),
  })
  if (!response.ok) throw new Error(`Profit and loss failed with status ${response.status}.`)
  return (await response.json()) as AccountSummaryReport
}

export async function listAccountBalanceSheet(session: AuthSession, accountingYearId?: number | null) {
  const response = await fetch(`${apiBaseUrl}/api/v1/accounts/reports/balance-sheet${accountingYearQuery(accountingYearId)}`, {
    cache: "no-store",
    headers: authHeaders(session),
  })
  if (!response.ok) throw new Error(`Balance sheet failed with status ${response.status}.`)
  return (await response.json()) as AccountSummaryReport
}

export async function recalculateAccountReports(session: AuthSession) {
  const response = await fetch(`${apiBaseUrl}/api/v1/accounts/postings/repost-sources`, {
    body: "{}",
    cache: "no-store",
    headers: { ...authHeaders(session), "Content-Type": "application/json" },
    method: "POST",
  })
  if (!response.ok) throw new Error(`Account report recalculation failed with status ${response.status}.`)
  const result = (await response.json()) as { ok: boolean; error?: string }
  if (!result.ok) throw new Error(result.error ?? "Account report recalculation failed.")
  return result
}

export async function listAccountingPeriodLocks(session: AuthSession) {
  const response = await fetch(`${apiBaseUrl}/api/v1/accounts/period-locks`, {
    cache: "no-store",
    headers: authHeaders(session),
  })
  if (!response.ok) throw new Error(await responseErrorMessage(response, "Period lock list failed."))
  return (await response.json()) as AccountingPeriodLock[]
}

export async function createAccountingPeriodLock(session: AuthSession, input: AccountingPeriodLockInput) {
  const response = await fetch(`${apiBaseUrl}/api/v1/accounts/period-locks`, {
    body: JSON.stringify(input),
    cache: "no-store",
    headers: { ...authHeaders(session), "Content-Type": "application/json" },
    method: "POST",
  })
  if (!response.ok) throw new Error(await responseErrorMessage(response, "Period lock save failed."))
  const result = (await response.json()) as { ok: boolean; lock?: AccountingPeriodLock; error?: string }
  if (!result.ok || !result.lock) throw new Error(result.error ?? "Period lock save failed.")
  return result.lock
}

export async function releaseAccountingPeriodLock(session: AuthSession, lock: AccountingPeriodLock) {
  const response = await fetch(`${apiBaseUrl}/api/v1/accounts/period-locks/${lock.uuid}/release`, {
    body: "{}",
    cache: "no-store",
    headers: { ...authHeaders(session), "Content-Type": "application/json" },
    method: "POST",
  })
  if (!response.ok) throw new Error(await responseErrorMessage(response, "Period lock release failed."))
  const result = (await response.json()) as { ok: boolean; lock?: AccountingPeriodLock; error?: string }
  if (!result.ok || !result.lock) throw new Error(result.error ?? "Period lock release failed.")
  return result.lock
}

async function accountVoucherAction(session: AuthSession, voucher: AccountVoucher, action: "post" | "cancel") {
  const response = await fetch(`${apiBaseUrl}/api/v1/accounts/vouchers/${voucher.uuid}/${action}`, {
    body: "{}",
    cache: "no-store",
    headers: { ...authHeaders(session), "Content-Type": "application/json" },
    method: "POST",
  })
  if (!response.ok) throw new Error(`Account voucher ${action} failed with status ${response.status}.`)
  const result = (await response.json()) as { ok: boolean; voucher?: AccountVoucher; error?: string }
  if (!result.ok || !result.voucher) throw new Error(result.error ?? `Account voucher ${action} failed.`)
  return result.voucher
}

function accountingYearQuery(accountingYearId?: number | null) {
  return accountingYearId ? `?accounting_year_id=${encodeURIComponent(String(accountingYearId))}` : ""
}

export async function upsertAccountLedger(session: AuthSession, type: AccountLedgerType, input: AccountLedgerInput) {
  const response = await fetch(`${apiBaseUrl}/api/v1/accounts/ledgers/${type}/upsert`, {
    body: JSON.stringify(input),
    cache: "no-store",
    headers: { ...authHeaders(session), "Content-Type": "application/json" },
    method: "POST",
  })
  if (!response.ok) throw new Error(`Account ledger save failed with status ${response.status}.`)
  const result = (await response.json()) as { ok: boolean; ledger?: AccountLedger; error?: string }
  if (!result.ok || !result.ledger) throw new Error(result.error ?? "Account ledger save failed.")
  return result.ledger
}

export async function listAccountBookEntries(session: AuthSession, bookType: AccountBookType) {
  const response = await fetch(`${apiBaseUrl}/api/v1/accounts/${bookPath(bookType)}`, {
    cache: "no-store",
    headers: authHeaders(session),
  })
  if (!response.ok) throw new Error(`Account book list failed with status ${response.status}.`)
  return (await response.json()) as AccountBookEntry[]
}

export async function upsertAccountBookEntry(session: AuthSession, bookType: AccountBookType, input: AccountBookEntryInput) {
  const response = await fetch(`${apiBaseUrl}/api/v1/accounts/${bookPath(bookType)}/upsert`, {
    body: JSON.stringify(input),
    cache: "no-store",
    headers: { ...authHeaders(session), "Content-Type": "application/json" },
    method: "POST",
  })
  if (!response.ok) throw new Error(`Account book save failed with status ${response.status}.`)
  const result = (await response.json()) as { ok: boolean; entry?: AccountBookEntry; error?: string }
  if (!result.ok || !result.entry) throw new Error(result.error ?? "Account book save failed.")
  return result.entry
}

export async function destroyAccountBookEntry(session: AuthSession, bookType: AccountBookType, entry: AccountBookEntry) {
  const response = await fetch(`${apiBaseUrl}/api/v1/accounts/${bookPath(bookType)}/${entry.uuid}/destroy`, {
    body: "{}",
    cache: "no-store",
    headers: { ...authHeaders(session), "Content-Type": "application/json" },
    method: "POST",
  })
  if (!response.ok) throw new Error(`Account book delete failed with status ${response.status}.`)
}

export async function restoreAccountBookEntry(session: AuthSession, bookType: AccountBookType, entry: AccountBookEntry) {
  const response = await fetch(`${apiBaseUrl}/api/v1/accounts/${bookPath(bookType)}/${entry.uuid}/restore`, {
    body: "{}",
    cache: "no-store",
    headers: { ...authHeaders(session), "Content-Type": "application/json" },
    method: "POST",
  })
  if (!response.ok) throw new Error(`Account book restore failed with status ${response.status}.`)
}

export async function addAccountBookComment(session: AuthSession, bookType: AccountBookType, entry: AccountBookEntry, body: string) {
  return accountBookAction(session, bookType, entry, "comment", { body })
}

export async function runAccountBookTool(session: AuthSession, bookType: AccountBookType, entry: AccountBookEntry, tool: string) {
  return accountBookAction(session, bookType, entry, "tool", { tool })
}

async function accountBookAction(session: AuthSession, bookType: AccountBookType, entry: AccountBookEntry, action: "comment" | "tool", body: Record<string, unknown>) {
  const response = await fetch(`${apiBaseUrl}/api/v1/accounts/${bookPath(bookType)}/${entry.uuid}/${action}`, {
    body: JSON.stringify(body),
    cache: "no-store",
    headers: { ...authHeaders(session), "Content-Type": "application/json" },
    method: "POST",
  })
  if (!response.ok) throw new Error(`Account book ${action} failed with status ${response.status}.`)
  const result = (await response.json()) as { ok: boolean; entry?: AccountBookEntry; error?: string }
  if (!result.ok || !result.entry) throw new Error(result.error ?? `Account book ${action} failed.`)
  return result.entry
}

function bookPath(bookType: AccountBookType) {
  return bookType === "bank" ? "bank-book" : "cash-book"
}

async function responseErrorMessage(response: Response, fallback: string) {
  try {
    const payload = (await response.json()) as { error?: string; message?: string }
    return payload.error ?? payload.message ?? `${fallback} Status ${response.status}.`
  } catch {
    return `${fallback} Status ${response.status}.`
  }
}
