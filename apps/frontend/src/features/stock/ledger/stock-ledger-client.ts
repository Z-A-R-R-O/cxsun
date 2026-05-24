import { apiBaseUrl, authHeaders, type AuthSession } from "src/features/auth/auth-client"

export type StockBarcodeMode = "readable" | "numeric"
export type StockSerializationMode = "partial" | "full" | "single"

export interface StockLedgerSettings {
  id: number
  uuid: string
  tenant_id: number
  company_id: number
  serialization_enabled: boolean | number
  batch_enabled: boolean | number
  default_warehouse_id: string | null
  default_warehouse_name: string | null
  serial_format: string
  batch_format: string
  barcode_format: string
  barcode_mode: StockBarcodeMode
}

export interface StockLedgerReceiptIntakeItem {
  id: number
  uuid: string | null
  product_id: string | null
  product_name: string
  product_code?: string | null
  hsn_code: string | null
  unit: string | null
  quantity: number
  generated_quantity: number
  pending_quantity: number
}

export interface StockLedgerReceiptIntake {
  receipt: Record<string, unknown> & { id: number; uuid: string; entry_no: string; entry_date: string }
  items: StockLedgerReceiptIntakeItem[]
  serializations: StockSerialization[]
}

export interface StockSerializationItem {
  id: number
  uuid: string
  serial_no: string
  batch_no: string | null
  barcode_value: string
  quantity: number
  is_verified: boolean | number
  stock_movement_id: number | null
}

export interface StockSerialization {
  id: number
  uuid: string
  stock_ledger_entry_id: number | null
  purchase_receipt_no: string
  purchase_receipt_item_id: number
  product_name: string
  product_code: string | null
  warehouse_id: string | null
  warehouse_name: string | null
  expected_quantity: number
  generated_quantity: number
  verified_quantity: number
  pending_quantity: number
  mode: StockSerializationMode
  batch_no: string | null
  barcode_mode: StockBarcodeMode
  status: string
  items: StockSerializationItem[]
}

export interface StockLedgerEntry {
  id: number
  uuid: string
  tenant_id: number
  company_id: number
  accounting_year_id: number
  entry_no: string
  entry_date: string
  status: string
  source_type: string
  source_uuid: string | null
  source_no: string | null
  notes: string | null
  created_by: string
  updated_by: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
  generated_quantity: number
  verified_quantity: number
  posted_quantity: number
  serializations: StockSerialization[]
}

export type StockLedgerEntryInput = Partial<StockLedgerEntry> & {
  purchase_receipt_uuid?: string | null
}

export interface StockLiveBalance {
  id: number
  product_id: string | null
  product_code: string | null
  product_name: string
  warehouse_id: string | null
  warehouse_name: string | null
  batch_no: string | null
  serial_no: string | null
  barcode_value: string | null
  quantity_on_hand: number
  quantity_reserved: number
  quantity_available: number
}

export async function getStockLedgerSettings(session: AuthSession) {
  const response = await fetch(`${apiBaseUrl}/api/v1/stock/ledger/settings`, { cache: "no-store", headers: authHeaders(session) })
  if (!response.ok) throw new Error(`Stock settings failed with status ${response.status}.`)
  return (await response.json()) as StockLedgerSettings
}

export async function listStockLedgerEntries(session: AuthSession) {
  const response = await fetch(`${apiBaseUrl}/api/v1/stock/ledger/entries`, { cache: "no-store", headers: authHeaders(session) })
  if (!response.ok) throw new Error(`Stock ledger list failed with status ${response.status}.`)
  return (await response.json()) as StockLedgerEntry[]
}

export async function upsertStockLedgerEntry(session: AuthSession, input: StockLedgerEntryInput) {
  const response = await fetch(`${apiBaseUrl}/api/v1/stock/ledger/entries/upsert`, {
    body: JSON.stringify(input),
    cache: "no-store",
    headers: { ...authHeaders(session), "Content-Type": "application/json" },
    method: "POST",
  })
  if (!response.ok) throw new Error(`Stock ledger save failed with status ${response.status}.`)
  const result = (await response.json()) as { ok: boolean; entry?: StockLedgerEntry; error?: string }
  if (!result.ok || !result.entry) throw new Error(result.error ?? "Stock ledger save failed.")
  return result.entry
}

export async function upsertStockLedgerSettings(session: AuthSession, input: Partial<StockLedgerSettings>) {
  const response = await fetch(`${apiBaseUrl}/api/v1/stock/ledger/settings`, {
    body: JSON.stringify(input),
    cache: "no-store",
    headers: { ...authHeaders(session), "Content-Type": "application/json" },
    method: "POST",
  })
  if (!response.ok) throw new Error(`Stock settings save failed with status ${response.status}.`)
  const result = (await response.json()) as { ok: boolean; settings?: StockLedgerSettings; error?: string }
  if (!result.ok || !result.settings) throw new Error(result.error ?? "Stock settings save failed.")
  return result.settings
}

export async function getPurchaseReceiptIntake(session: AuthSession, receiptIdOrUuid: string) {
  const response = await fetch(`${apiBaseUrl}/api/v1/stock/ledger/purchase-receipts/${encodeURIComponent(receiptIdOrUuid)}/intake`, {
    cache: "no-store",
    headers: authHeaders(session),
  })
  if (!response.ok) throw new Error(`Purchase receipt intake failed with status ${response.status}.`)
  return (await response.json()) as StockLedgerReceiptIntake
}

export async function generateStockSerialization(session: AuthSession, input: {
  stock_ledger_entry_uuid?: string
  purchase_receipt_uuid: string
  purchase_receipt_item_id: number
  quantity: number
  mode: StockSerializationMode
  warehouse_id?: string | null
  warehouse_name?: string | null
  batch_no?: string | null
}) {
  const response = await fetch(`${apiBaseUrl}/api/v1/stock/ledger/serializations/generate`, {
    body: JSON.stringify(input),
    cache: "no-store",
    headers: { ...authHeaders(session), "Content-Type": "application/json" },
    method: "POST",
  })
  if (!response.ok) throw new Error(`Serial generation failed with status ${response.status}.`)
  const result = (await response.json()) as { ok: boolean; serialization?: StockSerialization; error?: string }
  if (!result.ok || !result.serialization) throw new Error(result.error ?? "Serial generation failed.")
  return result.serialization
}

export async function verifyStockSerialization(session: AuthSession, serializationUuid: string, barcodes: string[]) {
  const response = await fetch(`${apiBaseUrl}/api/v1/stock/ledger/serializations/${encodeURIComponent(serializationUuid)}/verify`, {
    body: JSON.stringify({ barcodes }),
    cache: "no-store",
    headers: { ...authHeaders(session), "Content-Type": "application/json" },
    method: "POST",
  })
  if (!response.ok) throw new Error(`Serial verification failed with status ${response.status}.`)
  const result = (await response.json()) as { ok: boolean; serialization?: StockSerialization; matched: string[]; unknown: string[]; error?: string }
  if (!result.ok || !result.serialization) throw new Error(result.error ?? "Serial verification failed.")
  return result
}

export async function postStockSerialization(session: AuthSession, serializationUuid: string) {
  const response = await fetch(`${apiBaseUrl}/api/v1/stock/ledger/serializations/${encodeURIComponent(serializationUuid)}/post`, {
    body: "{}",
    cache: "no-store",
    headers: { ...authHeaders(session), "Content-Type": "application/json" },
    method: "POST",
  })
  if (!response.ok) throw new Error(`Stock posting failed with status ${response.status}.`)
  const result = (await response.json()) as { ok: boolean; serialization?: StockSerialization; error?: string }
  if (!result.ok || !result.serialization) throw new Error(result.error ?? "Stock posting failed.")
  return result.serialization
}

export async function dropStockSerialization(session: AuthSession, serializationUuid: string) {
  const response = await fetch(`${apiBaseUrl}/api/v1/stock/ledger/serializations/${encodeURIComponent(serializationUuid)}/drop`, {
    body: "{}",
    cache: "no-store",
    headers: { ...authHeaders(session), "Content-Type": "application/json" },
    method: "POST",
  })
  if (!response.ok) throw new Error(`Stock barcode drop failed with status ${response.status}.`)
  const result = (await response.json()) as { ok: boolean; error?: string }
  if (!result.ok) throw new Error(result.error ?? "Stock barcode drop failed.")
}

export async function listStockLiveBalances(session: AuthSession) {
  const response = await fetch(`${apiBaseUrl}/api/v1/stock/ledger/balances`, { cache: "no-store", headers: authHeaders(session) })
  if (!response.ok) throw new Error(`Stock balances failed with status ${response.status}.`)
  return (await response.json()) as StockLiveBalance[]
}
