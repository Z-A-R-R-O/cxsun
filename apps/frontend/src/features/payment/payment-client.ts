import { apiBaseUrl, authHeaders, type AuthSession } from "src/features/auth/auth-client"
import type { MasterDataRecord } from "src/features/master-data/domain/master-data"
import { downloadPrintPdf } from "src/shared/print/download-print-pdf"

export interface PaymentAllocation {
  id?: number
  payment_entry_id?: number
  document_type: string
  document_id?: string | null
  document_no: string
  document_date?: string | null
  document_total: number
  previous_balance: number
  allocated_amount: number
  balance_after_allocation?: number
  sort_order?: number
}

export interface PaymentEntry {
  id: number
  uuid: string
  tenant_id: number
  company_id: number
  accounting_year_id: number
  payment_no: string
  payment_date: string
  party_id: string | null
  party_name: string
  party_type: string | null
  ledger_id: string | null
  ledger_name: string | null
  payment_mode: string
  bank_account_id: string | null
  reference_no: string | null
  reference_date: string | null
  amount: number
  tds_amount: number
  discount_amount: number
  round_off: number
  net_amount: number
  allocated_amount: number
  unallocated_amount: number
  status: string
  notes: string | null
  is_active: boolean | number
  created_at: string
  updated_at: string
  deleted_at: string | null
  document_number_warning?: string
  allocations: PaymentAllocation[]
  comments: Array<{ id: number; author_email: string; body: string; created_at: string }>
  activities: Array<{ id: number; activity_type: string; actor_email: string; message: string; payload: string; created_at: string }>
}

export type PaymentEntryInput = Partial<PaymentEntry> & {
  allocations: PaymentAllocation[]
}

export interface PaymentLookupOption {
  id: string
  label: string
  code?: string
  record: MasterDataRecord
}

export function emptyPaymentEntry(): PaymentEntryInput {
  return {
    payment_date: new Date().toISOString().slice(0, 10),
    party_id: null,
    party_name: "",
    party_type: "supplier",
    ledger_id: null,
    ledger_name: "Cash",
    payment_mode: "cash",
    bank_account_id: null,
    reference_no: "",
    reference_date: "",
    amount: 0,
    tds_amount: 0,
    discount_amount: 0,
    round_off: 0,
    status: "draft",
    notes: "",
    is_active: true,
    allocations: [emptyPaymentAllocation()],
  }
}

export function emptyPaymentAllocation(): PaymentAllocation {
  return {
    document_type: "purchase",
    document_id: null,
    document_no: "",
    document_date: "",
    document_total: 0,
    previous_balance: 0,
    allocated_amount: 0,
    sort_order: 1,
  }
}

export async function listPaymentEntries(session: AuthSession) {
  const response = await fetch(`${apiBaseUrl}/api/v1/entries/payment`, { cache: "no-store", headers: authHeaders(session) })
  if (!response.ok) throw new Error(`Payment list failed with status ${response.status}.`)
  return (await response.json()) as PaymentEntry[]
}

export async function getPaymentEntry(session: AuthSession, idOrUuid: string) {
  const response = await fetch(`${apiBaseUrl}/api/v1/entries/payment/${encodeURIComponent(idOrUuid)}`, { cache: "no-store", headers: authHeaders(session) })
  if (!response.ok) throw new Error(`Payment detail failed with status ${response.status}.`)
  return (await response.json()) as PaymentEntry
}

export async function upsertPaymentEntry(session: AuthSession, input: PaymentEntryInput) {
  const response = await fetch(`${apiBaseUrl}/api/v1/entries/payment/upsert`, {
    body: JSON.stringify(input),
    cache: "no-store",
    headers: { ...authHeaders(session), "Content-Type": "application/json" },
    method: "POST",
  })
  if (!response.ok) throw new Error(await responseErrorMessage(response, "Payment save failed."))
  const result = (await response.json()) as { ok: boolean; entry?: PaymentEntry; error?: string; warning?: string }
  if (!result.ok || !result.entry) throw new Error(result.error ?? "Payment save failed.")
  return { ...result.entry, document_number_warning: result.warning }
}

export async function destroyPaymentEntry(session: AuthSession, entry: PaymentEntry) {
  return mutatePaymentEntry(session, entry.uuid, "destroy")
}

export async function restorePaymentEntry(session: AuthSession, entry: PaymentEntry) {
  return mutatePaymentEntry(session, entry.uuid, "restore")
}

export async function createPaymentCorrection(session: AuthSession, entry: PaymentEntry) {
  return mutatePaymentEntry(session, entry.uuid, "correction")
}

export async function createPaymentReversal(session: AuthSession, entry: PaymentEntry) {
  return mutatePaymentEntry(session, entry.uuid, "reversal")
}

export async function addPaymentComment(session: AuthSession, entry: PaymentEntry, body: string) {
  const response = await fetch(`${apiBaseUrl}/api/v1/entries/payment/${entry.uuid}/comments`, {
    body: JSON.stringify({ body }),
    cache: "no-store",
    headers: { ...authHeaders(session), "Content-Type": "application/json" },
    method: "POST",
  })
  if (!response.ok) throw new Error(`Payment comment failed with status ${response.status}.`)
  const result = (await response.json()) as { ok: boolean; entry?: PaymentEntry; error?: string }
  if (!result.ok || !result.entry) throw new Error(result.error ?? "Payment comment failed.")
  return result.entry
}

export async function runPaymentTool(session: AuthSession, entry: PaymentEntry, tool: string, printHtml?: string) {
  const response = await fetch(`${apiBaseUrl}/api/v1/entries/payment/${entry.uuid}/tools`, {
    body: JSON.stringify({ printHtml, tool }),
    cache: "no-store",
    headers: { ...authHeaders(session), "Content-Type": "application/json" },
    method: "POST",
  })
  if (!response.ok) throw new Error(`Payment tool failed with status ${response.status}.`)
  const result = (await response.json()) as { ok: boolean; entry?: PaymentEntry; error?: string }
  if (!result.ok || !result.entry) throw new Error(result.error ?? "Payment tool failed.")
  return result.entry
}

export async function downloadPaymentPdf(session: AuthSession, entry: PaymentEntry, printHtml: string) {
  await downloadPrintPdf(session, `/api/v1/entries/payment/${entry.uuid}/pdf`, printHtml, entry.payment_no)
}

export async function listPaymentContactLookups(session: AuthSession) {
  const response = await fetch(`${apiBaseUrl}/api/v1/contacts`, { cache: "no-store", headers: authHeaders(session) })
  if (!response.ok) throw new Error(`Contact lookup failed with status ${response.status}.`)
  const records = (await response.json()) as MasterDataRecord[]
  return records.map((record) => {
    const code = readString(record.code)
    const name = readString(record.name)
    return { id: String(record.uuid ?? record.id), label: [code, name].filter(Boolean).join(" - ") || name || code || String(record.id), code: code || undefined, record }
  })
}

async function mutatePaymentEntry(session: AuthSession, idOrUuid: string, action: "correction" | "destroy" | "restore" | "reversal") {
  const response = await fetch(`${apiBaseUrl}/api/v1/entries/payment/${encodeURIComponent(idOrUuid)}/${action}`, {
    body: "{}",
    cache: "no-store",
    headers: { ...authHeaders(session), "Content-Type": "application/json" },
    method: "POST",
  })
  if (!response.ok) throw new Error(await responseErrorMessage(response, `Payment ${action} failed.`))
  const result = (await response.json()) as { ok: boolean; entry?: PaymentEntry; error?: string }
  if (!result.ok) throw new Error(result.error ?? `Payment ${action} failed.`)
  return result.entry ?? null
}

async function responseErrorMessage(response: Response, fallback: string) {
  try {
    const payload = (await response.json()) as { error?: string; message?: string }
    return payload.error ?? payload.message ?? `${fallback} Status ${response.status}.`
  } catch {
    return `${fallback} Status ${response.status}.`
  }
}

function readString(value: unknown) {
  return typeof value === "string" ? value.trim() : value === null || value === undefined ? "" : String(value).trim()
}
