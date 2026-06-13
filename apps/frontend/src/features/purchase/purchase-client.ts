import { apiBaseUrl, authHeaders, type AuthSession } from "src/features/auth/auth-client"
import type { MasterDataRecord } from "src/features/master-data/domain/master-data"

export type PurchaseCommonLookupKey = "hsnCodes" | "units" | "taxes"
type PurchaseLookupModuleKey = "contacts" | "orders" | "products" | PurchaseCommonLookupKey

export interface PurchaseLookupOption {
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

export interface PurchaseEntryItem {
  id?: number
  purchase_entry_id?: number
  product_id?: string | null
  product_name: string
  description?: string | null
  colour?: string | null
  hsn_code?: string | null
  po_no?: string | null
  dc_no?: string | null
  size?: string | null
  unit?: string | null
  quantity: number
  rate: number
  discount_amount: number
  tax_rate: number
  tax_amount?: number
  line_total?: number
  accounting_category?: string | null
  accounting_ledger_id?: number | null
  sort_order?: number
}

export interface PurchaseEntry {
  id: number
  uuid: string
  tenant_id: number
  company_id: number
  accounting_year_id: number
  entry_no: string
  entry_date: string
  supplier_id: string | null
  supplier_name: string
  supplier_gstin: string | null
  supplier_state_code: string | null
  supplier_state_name: string | null
  supplier_bill_no: string | null
  supplier_bill_date: string | null
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
  irn: string | null
  ack_no: string | null
  ack_date: string | null
  signed_qr: string | null
  eway_bill_no: string | null
  eway_bill_date: string | null
  transport_id: string | null
  transport_name: string | null
  transport_gst: string | null
  transport_address: string | null
  transport_contact_no: string | null
  transport_contact_person: string | null
  vehicle_no: string | null
  eway_part: string | null
  notes: string | null
  terms: string | null
  accounting_posting_mode?: string | null
  accounting_category?: string | null
  accounting_ledger_id?: number | null
  accounting_posted_at?: string | null
  is_active: boolean | number
  created_at: string
  updated_at: string
  deleted_at: string | null
  document_number_warning?: string
  items: PurchaseEntryItem[]
  comments: Array<{ id: number; author_email: string; body: string; created_at: string }>
  activities: Array<{ id: number; activity_type: string; actor_email: string; message: string; payload: string; created_at: string }>
}

export type PurchaseEntryInput = Partial<PurchaseEntry> & {
  items: PurchaseEntryItem[]
}

export function emptyPurchaseEntry(): PurchaseEntryInput {
  return {
    entry_date: new Date().toISOString().slice(0, 10),
    supplier_name: "",
    supplier_gstin: "",
    supplier_state_code: "",
    supplier_state_name: "",
    supplier_bill_no: "",
    supplier_bill_date: "",
    billing_address: "",
    shipping_address: "",
    place_of_supply: "cgst-sgst",
    reference_no: "",
    due_date: "",
    paid_amount: 0,
    status: "draft",
    payment_status: "unpaid",
    irn: "",
    ack_no: "",
    ack_date: "",
    signed_qr: "",
    eway_bill_no: "",
    eway_bill_date: "",
    transport_id: null,
    transport_name: "",
    transport_gst: "",
    transport_address: "",
    transport_contact_no: "",
    transport_contact_person: "",
    vehicle_no: "",
    eway_part: "part-b",
    notes: "",
    terms: "Supplier bill accepted subject to goods, rate, quantity, and quality verification.",
    accounting_posting_mode: "auto",
    accounting_category: "purchase",
    accounting_ledger_id: null,
    is_active: true,
    items: [],
  }
}

export function emptyPurchaseItem(): PurchaseEntryItem {
  return {
    product_name: "",
    description: "",
    colour: "",
    hsn_code: "",
    po_no: "",
    dc_no: "",
    size: "",
    unit: "",
    quantity: 1,
    rate: 0,
    discount_amount: 0,
    tax_rate: 0,
    accounting_category: null,
    accounting_ledger_id: null,
  }
}

export async function listPurchaseEntries(session: AuthSession) {
  const response = await fetch(`${apiBaseUrl}/api/v1/entries/purchase`, {
    cache: "no-store",
    headers: authHeaders(session),
  })
  if (!response.ok) throw new Error(`Purchase list failed with status ${response.status}.`)
  return (await response.json()) as PurchaseEntry[]
}

export async function listPurchaseContactLookups(session: AuthSession) {
  const records = await listLookupRecords(session, "/api/v1/contacts")
  return records.map((record) => recordToPurchaseLookupOption(record, "contacts"))
}

export async function listPurchaseProductLookups(session: AuthSession) {
  const records = await listLookupRecords(session, "/api/v1/products")
  return records.map((record) => recordToPurchaseLookupOption(record, "products"))
}

export async function listPurchaseOrderLookups(session: AuthSession) {
  const records = await listLookupRecords(session, "/api/v1/orders")
  return records.map((record) => recordToPurchaseLookupOption(record, "orders"))
}

export async function listPurchaseCommonLookups(session: AuthSession, moduleKey: PurchaseCommonLookupKey) {
  const records = await listLookupRecords(session, `/api/v1/common/${encodeURIComponent(moduleKey)}`)
  return records.map((record) => recordToPurchaseLookupOption(record, moduleKey))
}

export async function getPurchaseEntry(session: AuthSession, idOrUuid: string) {
  const response = await fetch(`${apiBaseUrl}/api/v1/entries/purchase/${encodeURIComponent(idOrUuid)}`, {
    cache: "no-store",
    headers: authHeaders(session),
  })
  if (!response.ok) throw new Error(`Purchase entry failed with status ${response.status}.`)
  return (await response.json()) as PurchaseEntry
}

export async function upsertPurchaseEntry(session: AuthSession, input: PurchaseEntryInput) {
  const response = await fetch(`${apiBaseUrl}/api/v1/entries/purchase/upsert`, {
    body: JSON.stringify(input),
    cache: "no-store",
    headers: { ...authHeaders(session), "Content-Type": "application/json" },
    method: "POST",
  })
  if (!response.ok) throw new Error(`Purchase save failed with status ${response.status}.`)
  const result = (await response.json()) as { ok: boolean; entry?: PurchaseEntry; error?: string; warning?: string }
  if (!result.ok || !result.entry) throw new Error(result.error ?? "Purchase save failed.")
  return { ...result.entry, document_number_warning: result.warning }
}

export async function destroyPurchaseEntry(session: AuthSession, entry: PurchaseEntry) {
  return mutatePurchaseEntry(session, entry.uuid, "destroy")
}

export async function restorePurchaseEntry(session: AuthSession, entry: PurchaseEntry) {
  return mutatePurchaseEntry(session, entry.uuid, "restore")
}

export async function addPurchaseComment(session: AuthSession, entry: PurchaseEntry, body: string) {
  const response = await fetch(`${apiBaseUrl}/api/v1/entries/purchase/${entry.uuid}/comments`, {
    body: JSON.stringify({ body }),
    cache: "no-store",
    headers: { ...authHeaders(session), "Content-Type": "application/json" },
    method: "POST",
  })
  if (!response.ok) throw new Error(`Purchase comment failed with status ${response.status}.`)
  const result = (await response.json()) as { ok: boolean; entry?: PurchaseEntry; error?: string }
  if (!result.ok || !result.entry) throw new Error(result.error ?? "Purchase comment failed.")
  return result.entry
}

export async function runPurchaseTool(session: AuthSession, entry: PurchaseEntry, tool: string, printHtml?: string) {
  const response = await fetch(`${apiBaseUrl}/api/v1/entries/purchase/${entry.uuid}/tools`, {
    body: JSON.stringify({ printHtml, tool }),
    cache: "no-store",
    headers: { ...authHeaders(session), "Content-Type": "application/json" },
    method: "POST",
  })
  if (!response.ok) throw new Error(`Purchase tool failed with status ${response.status}.`)
  const result = (await response.json()) as { ok: boolean; entry?: PurchaseEntry; error?: string }
  if (!result.ok || !result.entry) throw new Error(result.error ?? "Purchase tool failed.")
  return result.entry
}

async function mutatePurchaseEntry(session: AuthSession, idOrUuid: string, action: "destroy" | "restore") {
  const response = await fetch(`${apiBaseUrl}/api/v1/entries/purchase/${encodeURIComponent(idOrUuid)}/${action}`, {
    body: "{}",
    cache: "no-store",
    headers: { ...authHeaders(session), "Content-Type": "application/json" },
    method: "POST",
  })
  if (!response.ok) throw new Error(`Purchase ${action} failed with status ${response.status}.`)
  const result = (await response.json()) as { ok: boolean; error?: string }
  if (!result.ok) throw new Error(result.error ?? `Purchase ${action} failed.`)
}

async function listLookupRecords(session: AuthSession, endpoint: string) {
  const response = await fetch(`${apiBaseUrl}${endpoint}`, {
    cache: "no-store",
    headers: authHeaders(session),
  })
  if (!response.ok) throw new Error(`Lookup list failed with status ${response.status}.`)
  return (await response.json()) as MasterDataRecord[]
}

function recordToPurchaseLookupOption(record: MasterDataRecord, moduleKey: PurchaseLookupModuleKey): PurchaseLookupOption {
  const code = readString(record.code)
  const name = readString(record.name)
  const description = readString(record.description)
  const taxRate = readNumber(record.rate_percent)
  const primaryAddress = Array.isArray(record.addresses) ? record.addresses.find((item) => Boolean((item as Record<string, unknown>).isDefault)) ?? record.addresses[0] : null
  const addressText = primaryAddress ? contactAddressText(primaryAddress as Record<string, unknown>) : description
  const label = moduleKey === "taxes"
    ? [`${taxRate ?? 0}%`, description].filter(Boolean).join(" - ")
    : [code, name].filter(Boolean).join(" - ") || name || code || String(record.uuid ?? record.id)
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





