import { apiBaseUrl, authHeaders, type AuthSession } from "src/features/auth/auth-client"
import type { MasterDataRecord } from "src/features/master-data/domain/master-data"
import { downloadPrintPdf } from "src/shared/print/download-print-pdf"

export interface ReceiptAllocation {
  id?: number
  receipt_entry_id?: number
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

export interface ReceiptEntry {
  id: number
  uuid: string
  tenant_id: number
  company_id: number
  accounting_year_id: number
  receipt_no: string
  receipt_date: string
  party_id: string | null
  party_name: string
  party_type: string | null
  ledger_id: string | null
  ledger_name: string | null
  receipt_mode: string
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
  allocations: ReceiptAllocation[]
  comments: Array<{ id: number; author_email: string; body: string; created_at: string }>
  activities: Array<{ id: number; activity_type: string; actor_email: string; message: string; payload: string; created_at: string }>
}

export type ReceiptEntryInput = Partial<ReceiptEntry> & {
  allocations: ReceiptAllocation[]
}

export interface ReceiptLookupOption {
  id: string
  label: string
  code?: string
  record: MasterDataRecord
}

export function emptyReceiptEntry(): ReceiptEntryInput {
  return {
    receipt_date: new Date().toISOString().slice(0, 10),
    party_id: null,
    party_name: "",
    party_type: "customer",
    ledger_id: null,
    ledger_name: "Cash",
    receipt_mode: "cash",
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
    allocations: [emptyReceiptAllocation()],
  }
}

export function emptyReceiptAllocation(): ReceiptAllocation {
  return {
    document_type: "sales",
    document_id: null,
    document_no: "",
    document_date: "",
    document_total: 0,
    previous_balance: 0,
    allocated_amount: 0,
    sort_order: 1,
  }
}

export async function listReceiptEntries(session: AuthSession) {
  const response = await fetch(`${apiBaseUrl}/api/v1/entries/receipt`, { cache: "no-store", headers: authHeaders(session) })
  if (!response.ok) throw new Error(`Receipt list failed with status ${response.status}.`)
  return (await response.json()) as ReceiptEntry[]
}

export async function getReceiptEntry(session: AuthSession, idOrUuid: string) {
  const response = await fetch(`${apiBaseUrl}/api/v1/entries/receipt/${encodeURIComponent(idOrUuid)}`, { cache: "no-store", headers: authHeaders(session) })
  if (!response.ok) throw new Error(`Receipt detail failed with status ${response.status}.`)
  return (await response.json()) as ReceiptEntry
}

export async function upsertReceiptEntry(session: AuthSession, input: ReceiptEntryInput) {
  const response = await fetch(`${apiBaseUrl}/api/v1/entries/receipt/upsert`, {
    body: JSON.stringify(input),
    cache: "no-store",
    headers: { ...authHeaders(session), "Content-Type": "application/json" },
    method: "POST",
  })
  if (!response.ok) throw new Error(await responseErrorMessage(response, "Receipt save failed."))
  const result = (await response.json()) as { ok: boolean; entry?: ReceiptEntry; error?: string; warning?: string }
  if (!result.ok || !result.entry) throw new Error(result.error ?? "Receipt save failed.")
  return { ...result.entry, document_number_warning: result.warning }
}

export async function destroyReceiptEntry(session: AuthSession, entry: ReceiptEntry) {
  return mutateReceiptEntry(session, entry.uuid, "destroy")
}

export async function restoreReceiptEntry(session: AuthSession, entry: ReceiptEntry) {
  return mutateReceiptEntry(session, entry.uuid, "restore")
}

export async function createReceiptCorrection(session: AuthSession, entry: ReceiptEntry) {
  return mutateReceiptEntry(session, entry.uuid, "correction")
}

export async function createReceiptReversal(session: AuthSession, entry: ReceiptEntry) {
  return mutateReceiptEntry(session, entry.uuid, "reversal")
}

export async function addReceiptComment(session: AuthSession, entry: ReceiptEntry, body: string) {
  const response = await fetch(`${apiBaseUrl}/api/v1/entries/receipt/${entry.uuid}/comments`, {
    body: JSON.stringify({ body }),
    cache: "no-store",
    headers: { ...authHeaders(session), "Content-Type": "application/json" },
    method: "POST",
  })
  if (!response.ok) throw new Error(`Receipt comment failed with status ${response.status}.`)
  const result = (await response.json()) as { ok: boolean; entry?: ReceiptEntry; error?: string }
  if (!result.ok || !result.entry) throw new Error(result.error ?? "Receipt comment failed.")
  return result.entry
}

export async function runReceiptTool(session: AuthSession, entry: ReceiptEntry, tool: string, printHtml?: string) {
  const response = await fetch(`${apiBaseUrl}/api/v1/entries/receipt/${entry.uuid}/tools`, {
    body: JSON.stringify({ printHtml, tool }),
    cache: "no-store",
    headers: { ...authHeaders(session), "Content-Type": "application/json" },
    method: "POST",
  })
  if (!response.ok) throw new Error(`Receipt tool failed with status ${response.status}.`)
  const result = (await response.json()) as { ok: boolean; entry?: ReceiptEntry; error?: string }
  if (!result.ok || !result.entry) throw new Error(result.error ?? "Receipt tool failed.")
  return result.entry
}

export async function downloadReceiptPdf(session: AuthSession, entry: ReceiptEntry, printHtml: string) {
  await downloadPrintPdf(session, `/api/v1/entries/receipt/${entry.uuid}/pdf`, printHtml, entry.receipt_no)
}

export async function listReceiptContactLookups(session: AuthSession) {
  const response = await fetch(`${apiBaseUrl}/api/v1/contacts`, { cache: "no-store", headers: authHeaders(session) })
  if (!response.ok) throw new Error(`Contact lookup failed with status ${response.status}.`)
  const records = (await response.json()) as MasterDataRecord[]
  return records.map((record) => {
    const code = readString(record.code)
    const name = readString(record.name)
    return { id: String(record.uuid ?? record.id), label: [code, name].filter(Boolean).join(" - ") || name || code || String(record.id), code: code || undefined, record }
  })
}

async function mutateReceiptEntry(session: AuthSession, idOrUuid: string, action: "correction" | "destroy" | "restore" | "reversal") {
  const response = await fetch(`${apiBaseUrl}/api/v1/entries/receipt/${encodeURIComponent(idOrUuid)}/${action}`, {
    body: "{}",
    cache: "no-store",
    headers: { ...authHeaders(session), "Content-Type": "application/json" },
    method: "POST",
  })
  if (!response.ok) throw new Error(await responseErrorMessage(response, `Receipt ${action} failed.`))
  const result = (await response.json()) as { ok: boolean; entry?: ReceiptEntry; error?: string }
  if (!result.ok) throw new Error(result.error ?? `Receipt ${action} failed.`)
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
