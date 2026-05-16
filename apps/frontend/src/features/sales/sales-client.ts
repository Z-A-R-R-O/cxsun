import { apiBaseUrl, authHeaders, type AuthSession } from "src/features/auth/auth-client"
import type { MasterDataRecord } from "src/features/master-data/domain/master-data"

export type SalesCommonLookupKey = "hsnCodes" | "units" | "taxes"

export interface SalesLookupOption {
  id: string
  label: string
  code?: string
  description?: string
  billingAddress?: string
  shippingAddress?: string
  hsnCode?: string
  unit?: string
  taxRate?: number
  rate?: number
  record: MasterDataRecord
}

export interface SalesEntryItem {
  id?: number
  sales_entry_id?: number
  product_id?: string | null
  product_name: string
  description?: string | null
  hsn_code?: string | null
  unit?: string | null
  quantity: number
  rate: number
  discount_amount: number
  tax_rate: number
  tax_amount?: number
  line_total?: number
  sort_order?: number
}

export interface SalesEntry {
  id: number
  uuid: string
  tenant_id: number
  company_id: number
  accounting_year_id: number
  invoice_no: string
  invoice_date: string
  customer_id: string | null
  customer_name: string
  billing_address: string | null
  shipping_address: string | null
  place_of_supply: string | null
  reference_no: string | null
  due_date: string | null
  subtotal: number
  discount_total: number
  taxable_total: number
  tax_total: number
  round_off: number
  grand_total: number
  paid_amount: number
  balance_amount: number
  status: string
  payment_status: string
  notes: string | null
  terms: string | null
  is_active: boolean | number
  created_at: string
  updated_at: string
  deleted_at: string | null
  items: SalesEntryItem[]
  comments: Array<{ id: number; author_email: string; body: string; created_at: string }>
  activities: Array<{ id: number; activity_type: string; actor_email: string; message: string; payload: string; created_at: string }>
}

export type SalesEntryInput = Partial<SalesEntry> & {
  items: SalesEntryItem[]
}

export function emptySalesEntry(): SalesEntryInput {
  return {
    invoice_date: new Date().toISOString().slice(0, 10),
    customer_name: "",
    billing_address: "",
    shipping_address: "",
    place_of_supply: "",
    reference_no: "",
    due_date: "",
    paid_amount: 0,
    status: "draft",
    payment_status: "unpaid",
    notes: "",
    terms: "Goods once sold will not be taken back unless agreed in writing.",
    is_active: true,
    items: [],
  }
}

export function emptySalesItem(): SalesEntryItem {
  return {
    product_name: "",
    description: "",
    hsn_code: "",
    unit: "Nos",
    quantity: 1,
    rate: 0,
    discount_amount: 0,
    tax_rate: 0,
  }
}

export async function listSalesEntries(session: AuthSession) {
  const response = await fetch(`${apiBaseUrl}/api/v1/entries/sales`, {
    cache: "no-store",
    headers: authHeaders(session),
  })
  if (!response.ok) throw new Error(`Sales list failed with status ${response.status}.`)
  return (await response.json()) as SalesEntry[]
}

export async function listSalesContactLookups(session: AuthSession) {
  const records = await listLookupRecords(session, "/api/v1/contacts")
  return records.map((record) => recordToSalesLookupOption(record, "contacts"))
}

export async function listSalesProductLookups(session: AuthSession) {
  const records = await listLookupRecords(session, "/api/v1/products")
  return records.map((record) => recordToSalesLookupOption(record, "products"))
}

export async function listSalesCommonLookups(session: AuthSession, moduleKey: SalesCommonLookupKey) {
  const records = await listLookupRecords(session, `/api/v1/common/${encodeURIComponent(moduleKey)}`)
  return records.map((record) => recordToSalesLookupOption(record, moduleKey))
}

export async function getSalesEntry(session: AuthSession, idOrUuid: string) {
  const response = await fetch(`${apiBaseUrl}/api/v1/entries/sales/${encodeURIComponent(idOrUuid)}`, {
    cache: "no-store",
    headers: authHeaders(session),
  })
  if (!response.ok) throw new Error(`Sales entry failed with status ${response.status}.`)
  return (await response.json()) as SalesEntry
}

export async function upsertSalesEntry(session: AuthSession, input: SalesEntryInput) {
  const response = await fetch(`${apiBaseUrl}/api/v1/entries/sales/upsert`, {
    body: JSON.stringify(input),
    cache: "no-store",
    headers: { ...authHeaders(session), "Content-Type": "application/json" },
    method: "POST",
  })
  if (!response.ok) throw new Error(`Sales save failed with status ${response.status}.`)
  const result = (await response.json()) as { ok: boolean; entry?: SalesEntry; error?: string }
  if (!result.ok || !result.entry) throw new Error(result.error ?? "Sales save failed.")
  return result.entry
}

export async function destroySalesEntry(session: AuthSession, entry: SalesEntry) {
  return mutateSalesEntry(session, entry.uuid, "destroy")
}

export async function restoreSalesEntry(session: AuthSession, entry: SalesEntry) {
  return mutateSalesEntry(session, entry.uuid, "restore")
}

export async function addSalesComment(session: AuthSession, entry: SalesEntry, body: string) {
  const response = await fetch(`${apiBaseUrl}/api/v1/entries/sales/${entry.uuid}/comments`, {
    body: JSON.stringify({ body }),
    cache: "no-store",
    headers: { ...authHeaders(session), "Content-Type": "application/json" },
    method: "POST",
  })
  if (!response.ok) throw new Error(`Sales comment failed with status ${response.status}.`)
  const result = (await response.json()) as { ok: boolean; entry?: SalesEntry; error?: string }
  if (!result.ok || !result.entry) throw new Error(result.error ?? "Sales comment failed.")
  return result.entry
}

export async function runSalesTool(session: AuthSession, entry: SalesEntry, tool: string) {
  const response = await fetch(`${apiBaseUrl}/api/v1/entries/sales/${entry.uuid}/tools`, {
    body: JSON.stringify({ tool }),
    cache: "no-store",
    headers: { ...authHeaders(session), "Content-Type": "application/json" },
    method: "POST",
  })
  if (!response.ok) throw new Error(`Sales tool failed with status ${response.status}.`)
  const result = (await response.json()) as { ok: boolean; entry?: SalesEntry; error?: string }
  if (!result.ok || !result.entry) throw new Error(result.error ?? "Sales tool failed.")
  return result.entry
}

async function mutateSalesEntry(session: AuthSession, idOrUuid: string, action: "destroy" | "restore") {
  const response = await fetch(`${apiBaseUrl}/api/v1/entries/sales/${encodeURIComponent(idOrUuid)}/${action}`, {
    body: "{}",
    cache: "no-store",
    headers: { ...authHeaders(session), "Content-Type": "application/json" },
    method: "POST",
  })
  if (!response.ok) throw new Error(`Sales ${action} failed with status ${response.status}.`)
  const result = (await response.json()) as { ok: boolean; error?: string }
  if (!result.ok) throw new Error(result.error ?? `Sales ${action} failed.`)
}

async function listLookupRecords(session: AuthSession, endpoint: string) {
  const response = await fetch(`${apiBaseUrl}${endpoint}`, {
    cache: "no-store",
    headers: authHeaders(session),
  })
  if (!response.ok) throw new Error(`Lookup list failed with status ${response.status}.`)
  return (await response.json()) as MasterDataRecord[]
}

function recordToSalesLookupOption(record: MasterDataRecord, moduleKey: "contacts" | "products" | SalesCommonLookupKey): SalesLookupOption {
  const code = readString(record.code)
  const name = readString(record.name)
  const description = readString(record.description)
  const primaryAddress = Array.isArray(record.addresses) ? record.addresses.find((item) => Boolean((item as Record<string, unknown>).isDefault)) ?? record.addresses[0] : null
  const addressText = primaryAddress ? contactAddressText(primaryAddress as Record<string, unknown>) : description
  const label = [code, name].filter(Boolean).join(" - ") || name || code || String(record.uuid ?? record.id)
  const taxRate = readNumber(record.rate_percent)
  const unit = readString(record.symbol) || name || code

  return {
    id: String(record.uuid ?? record.id),
    label,
    code: code || undefined,
    description: description || undefined,
    billingAddress: moduleKey === "contacts" ? addressText || undefined : undefined,
    shippingAddress: moduleKey === "contacts" ? addressText || undefined : undefined,
    hsnCode: moduleKey === "hsnCodes" ? code || name || undefined : undefined,
    unit: moduleKey === "units" ? unit || undefined : undefined,
    taxRate: moduleKey === "taxes" ? taxRate : undefined,
    record,
  }
}

function contactAddressText(address: Record<string, unknown>) {
  return [
    readString(address.addressLine1),
    readString(address.addressLine2),
    readString(address.cityId),
    readString(address.districtId),
    readString(address.stateId),
    readString(address.pincodeId),
  ].filter(Boolean).join(", ")
}

function readString(value: unknown) {
  return typeof value === "string" ? value.trim() : ""
}

function readNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : undefined
  }
  return undefined
}
