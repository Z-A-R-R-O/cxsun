import { apiBaseUrl, authHeaders, type AuthSession } from "src/features/auth/auth-client"
import type { MasterDataRecord } from "src/features/master-data/domain/master-data"

export type QuotationCommonLookupKey = "hsnCodes" | "units" | "taxes"
type QuotationLookupModuleKey = "contacts" | "orders" | "products" | QuotationCommonLookupKey

export interface QuotationLookupOption {
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

export interface QuotationEntryItem {
  id?: number
  quotation_entry_id?: number
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

export interface QuotationEntry {
  id: number
  uuid: string
  tenant_id: number
  company_id: number
  accounting_year_id: number
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
  generated_sales_invoice_uuid: string | null
  generated_sales_invoice_no: string | null
  is_active: boolean | number
  created_at: string
  updated_at: string
  deleted_at: string | null
  document_number_warning?: string
  items: QuotationEntryItem[]
  comments: Array<{ id: number; author_email: string; body: string; created_at: string }>
  activities: Array<{ id: number; activity_type: string; actor_email: string; message: string; payload: string; created_at: string }>
}

export type QuotationEntryInput = Partial<QuotationEntry> & {
  items: QuotationEntryItem[]
}

export function emptyQuotationEntry(): QuotationEntryInput {
  return {
    invoice_date: new Date().toISOString().slice(0, 10),
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
    generated_sales_invoice_uuid: null,
    generated_sales_invoice_no: null,
    is_active: true,
    items: [],
  }
}

export function emptyQuotationItem(): QuotationEntryItem {
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

export async function listQuotationEntries(session: AuthSession) {
  const response = await fetch(`${apiBaseUrl}/api/v1/entries/quotation`, {
    cache: "no-store",
    headers: authHeaders(session),
  })
  if (!response.ok) throw new Error(`Quotation list failed with status ${response.status}.`)
  return (await response.json()) as QuotationEntry[]
}

export async function listQuotationContactLookups(session: AuthSession) {
  const records = await listLookupRecords(session, "/api/v1/contacts")
  return records.map((record) => recordToQuotationLookupOption(record, "contacts"))
}

export async function listQuotationProductLookups(session: AuthSession) {
  const records = await listLookupRecords(session, "/api/v1/products")
  return records.map((record) => recordToQuotationLookupOption(record, "products"))
}

export async function listQuotationOrderLookups(session: AuthSession) {
  const records = await listLookupRecords(session, "/api/v1/orders")
  return records.map((record) => recordToQuotationLookupOption(record, "orders"))
}

export async function listQuotationCommonLookups(session: AuthSession, moduleKey: QuotationCommonLookupKey) {
  const records = await listLookupRecords(session, `/api/v1/common/${encodeURIComponent(moduleKey)}`)
  return records.map((record) => recordToQuotationLookupOption(record, moduleKey))
}

export async function getQuotationEntry(session: AuthSession, idOrUuid: string) {
  const response = await fetch(`${apiBaseUrl}/api/v1/entries/quotation/${encodeURIComponent(idOrUuid)}`, {
    cache: "no-store",
    headers: authHeaders(session),
  })
  if (!response.ok) throw new Error(`Quotation entry failed with status ${response.status}.`)
  return (await response.json()) as QuotationEntry
}

export async function upsertQuotationEntry(session: AuthSession, input: QuotationEntryInput) {
  const response = await fetch(`${apiBaseUrl}/api/v1/entries/quotation/upsert`, {
    body: JSON.stringify(input),
    cache: "no-store",
    headers: { ...authHeaders(session), "Content-Type": "application/json" },
    method: "POST",
  })
  if (!response.ok) throw new Error(`Quotation save failed with status ${response.status}.`)
  const result = (await response.json()) as { ok: boolean; entry?: QuotationEntry; error?: string; warning?: string }
  if (!result.ok || !result.entry) throw new Error(result.error ?? "Quotation save failed.")
  return { ...result.entry, document_number_warning: result.warning }
}

export async function destroyQuotationEntry(session: AuthSession, entry: QuotationEntry) {
  return mutateQuotationEntry(session, entry.uuid, "destroy")
}

export async function restoreQuotationEntry(session: AuthSession, entry: QuotationEntry) {
  return mutateQuotationEntry(session, entry.uuid, "restore")
}

export async function addQuotationComment(session: AuthSession, entry: QuotationEntry, body: string) {
  const response = await fetch(`${apiBaseUrl}/api/v1/entries/quotation/${entry.uuid}/comments`, {
    body: JSON.stringify({ body }),
    cache: "no-store",
    headers: { ...authHeaders(session), "Content-Type": "application/json" },
    method: "POST",
  })
  if (!response.ok) throw new Error(`Quotation comment failed with status ${response.status}.`)
  const result = (await response.json()) as { ok: boolean; entry?: QuotationEntry; error?: string }
  if (!result.ok || !result.entry) throw new Error(result.error ?? "Quotation comment failed.")
  return result.entry
}

export async function runQuotationTool(session: AuthSession, entry: QuotationEntry, tool: string, printHtml?: string) {
  const response = await fetch(`${apiBaseUrl}/api/v1/entries/quotation/${entry.uuid}/tools`, {
    body: JSON.stringify({ printHtml, tool }),
    cache: "no-store",
    headers: { ...authHeaders(session), "Content-Type": "application/json" },
    method: "POST",
  })
  if (!response.ok) throw new Error(`Quotation tool failed with status ${response.status}.`)
  const result = (await response.json()) as { ok: boolean; entry?: QuotationEntry; error?: string }
  if (!result.ok || !result.entry) throw new Error(result.error ?? "Quotation tool failed.")
  return result.entry
}

export async function generateInvoiceFromQuotations(session: AuthSession, quotationIds: string[]) {
  const response = await fetch(`${apiBaseUrl}/api/v1/entries/quotation/generate-invoice`, {
    body: JSON.stringify({ quotationIds }),
    cache: "no-store",
    headers: { ...authHeaders(session), "Content-Type": "application/json" },
    method: "POST",
  })
  if (!response.ok) {
    const message = await readErrorMessage(response)
    throw new Error(message || `Quotation invoice generation failed with status ${response.status}.`)
  }
  const result = (await response.json()) as { ok: boolean; invoice?: { uuid: string; invoice_no: string }; error?: string }
  if (!result.ok || !result.invoice) throw new Error(result.error ?? "Quotation invoice generation failed.")
  return result.invoice
}

async function mutateQuotationEntry(session: AuthSession, idOrUuid: string, action: "destroy" | "restore") {
  const response = await fetch(`${apiBaseUrl}/api/v1/entries/quotation/${encodeURIComponent(idOrUuid)}/${action}`, {
    body: "{}",
    cache: "no-store",
    headers: { ...authHeaders(session), "Content-Type": "application/json" },
    method: "POST",
  })
  if (!response.ok) throw new Error(`Quotation ${action} failed with status ${response.status}.`)
  const result = (await response.json()) as { ok: boolean; error?: string }
  if (!result.ok) throw new Error(result.error ?? `Quotation ${action} failed.`)
}

async function readErrorMessage(response: Response) {
  try {
    const body = (await response.json()) as { message?: unknown; error?: unknown }
    return String(body.message ?? body.error ?? "")
  } catch {
    return ""
  }
}

async function listLookupRecords(session: AuthSession, endpoint: string) {
  const response = await fetch(`${apiBaseUrl}${endpoint}`, {
    cache: "no-store",
    headers: authHeaders(session),
  })
  if (!response.ok) throw new Error(`Lookup list failed with status ${response.status}.`)
  return (await response.json()) as MasterDataRecord[]
}

function recordToQuotationLookupOption(record: MasterDataRecord, moduleKey: QuotationLookupModuleKey): QuotationLookupOption {
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


