import { apiBaseUrl, authHeaders, type AuthSession } from "src/features/auth/auth-client"
import type { MasterDataRecord } from "src/features/master-data/domain/master-data"

export type ExportSalesCommonLookupKey = "hsnCodes" | "units" | "taxes"
type ExportSalesLookupModuleKey = "contacts" | "orders" | "products" | ExportSalesCommonLookupKey

export interface ExportSalesLookupOption {
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

export interface ExportSalesEntryItem {
  id?: number
  export_sales_entry_id?: number
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
  sort_order?: number
}

export interface ExportSalesEntry {
  id: number
  uuid: string
  tenant_id: number
  company_id: number
  accounting_year_id: number
  currency_id: number | null
  currency_name: string | null
  invoice_no: string
  invoice_date: string
  customer_id: string | null
  customer_name: string
  customer_gstin: string | null
  customer_state_code: string | null
  customer_state_name: string | null
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
  is_active: boolean | number
  created_at: string
  updated_at: string
  deleted_at: string | null
  document_number_warning?: string
  items: ExportSalesEntryItem[]
  comments: Array<{ id: number; author_email: string; body: string; created_at: string }>
  activities: Array<{ id: number; activity_type: string; actor_email: string; message: string; payload: string; created_at: string }>
}

export type ExportSalesEntryInput = Partial<ExportSalesEntry> & {
  items: ExportSalesEntryItem[]
}

export function emptyExportSalesEntry(): ExportSalesEntryInput {
  return {
    invoice_date: new Date().toISOString().slice(0, 10),
    currency_id: null,
    currency_name: "",
    customer_name: "",
    customer_gstin: "",
    customer_state_code: "",
    customer_state_name: "",
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
    terms: "Goods once sold will not be taken back unless agreed in writing.",
    is_active: true,
    items: [],
  }
}

export function emptyExportSalesItem(): ExportSalesEntryItem {
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
  }
}

export async function listExportSalesEntries(session: AuthSession) {
  const response = await fetch(`${apiBaseUrl}/api/v1/entries/export-sales`, {
    cache: "no-store",
    headers: authHeaders(session),
  })
  if (!response.ok) throw new Error(`Export sales list failed with status ${response.status}.`)
  return (await response.json()) as ExportSalesEntry[]
}

export async function listExportSalesContactLookups(session: AuthSession) {
  const records = await listLookupRecords(session, "/api/v1/contacts")
  return records.map((record) => recordToExportSalesLookupOption(record, "contacts"))
}

export async function listExportSalesProductLookups(session: AuthSession) {
  const records = await listLookupRecords(session, "/api/v1/products")
  return records.map((record) => recordToExportSalesLookupOption(record, "products"))
}

export async function listExportSalesOrderLookups(session: AuthSession) {
  const records = await listLookupRecords(session, "/api/v1/orders")
  return records.map((record) => recordToExportSalesLookupOption(record, "orders"))
}

export async function listExportSalesCommonLookups(session: AuthSession, moduleKey: ExportSalesCommonLookupKey) {
  const records = await listLookupRecords(session, `/api/v1/common/${encodeURIComponent(moduleKey)}`)
  return records.map((record) => recordToExportSalesLookupOption(record, moduleKey))
}

export async function getExportSalesEntry(session: AuthSession, idOrUuid: string) {
  const response = await fetch(`${apiBaseUrl}/api/v1/entries/export-sales/${encodeURIComponent(idOrUuid)}`, {
    cache: "no-store",
    headers: authHeaders(session),
  })
  if (!response.ok) throw new Error(`Export sales entry failed with status ${response.status}.`)
  return (await response.json()) as ExportSalesEntry
}

export async function upsertExportSalesEntry(session: AuthSession, input: ExportSalesEntryInput) {
  const response = await fetch(`${apiBaseUrl}/api/v1/entries/export-sales/upsert`, {
    body: JSON.stringify(input),
    cache: "no-store",
    headers: { ...authHeaders(session), "Content-Type": "application/json" },
    method: "POST",
  })
  if (!response.ok) throw new Error(`Export sales save failed with status ${response.status}.`)
  const result = (await response.json()) as { ok: boolean; entry?: ExportSalesEntry; error?: string; warning?: string }
  if (!result.ok || !result.entry) throw new Error(result.error ?? "Export sales save failed.")
  return { ...result.entry, document_number_warning: result.warning }
}

export async function destroyExportSalesEntry(session: AuthSession, entry: ExportSalesEntry) {
  return mutateExportSalesEntry(session, entry.uuid, "destroy")
}

export async function restoreExportSalesEntry(session: AuthSession, entry: ExportSalesEntry) {
  return mutateExportSalesEntry(session, entry.uuid, "restore")
}

export async function addExportSalesComment(session: AuthSession, entry: ExportSalesEntry, body: string) {
  const response = await fetch(`${apiBaseUrl}/api/v1/entries/export-sales/${entry.uuid}/comments`, {
    body: JSON.stringify({ body }),
    cache: "no-store",
    headers: { ...authHeaders(session), "Content-Type": "application/json" },
    method: "POST",
  })
  if (!response.ok) throw new Error(`Export sales comment failed with status ${response.status}.`)
  const result = (await response.json()) as { ok: boolean; entry?: ExportSalesEntry; error?: string }
  if (!result.ok || !result.entry) throw new Error(result.error ?? "Export sales comment failed.")
  return result.entry
}

export async function runExportSalesTool(session: AuthSession, entry: ExportSalesEntry, tool: string, printHtml?: string) {
  const response = await fetch(`${apiBaseUrl}/api/v1/entries/export-sales/${entry.uuid}/tools`, {
    body: JSON.stringify({ printHtml, tool }),
    cache: "no-store",
    headers: { ...authHeaders(session), "Content-Type": "application/json" },
    method: "POST",
  })
  if (!response.ok) throw new Error(`Export sales tool failed with status ${response.status}.`)
  const result = (await response.json()) as { ok: boolean; entry?: ExportSalesEntry; error?: string }
  if (!result.ok || !result.entry) throw new Error(result.error ?? "Export sales tool failed.")
  return result.entry
}

async function mutateExportSalesEntry(session: AuthSession, idOrUuid: string, action: "destroy" | "restore") {
  const response = await fetch(`${apiBaseUrl}/api/v1/entries/export-sales/${encodeURIComponent(idOrUuid)}/${action}`, {
    body: "{}",
    cache: "no-store",
    headers: { ...authHeaders(session), "Content-Type": "application/json" },
    method: "POST",
  })
  if (!response.ok) throw new Error(`Export sales ${action} failed with status ${response.status}.`)
  const result = (await response.json()) as { ok: boolean; error?: string }
  if (!result.ok) throw new Error(result.error ?? `Export sales ${action} failed.`)
}

async function listLookupRecords(session: AuthSession, endpoint: string) {
  const response = await fetch(`${apiBaseUrl}${endpoint}`, {
    cache: "no-store",
    headers: authHeaders(session),
  })
  if (!response.ok) throw new Error(`Lookup list failed with status ${response.status}.`)
  return (await response.json()) as MasterDataRecord[]
}

function recordToExportSalesLookupOption(record: MasterDataRecord, moduleKey: ExportSalesLookupModuleKey): ExportSalesLookupOption {
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




