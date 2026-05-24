export type StockMovementDirection = 'inward' | 'outward' | 'adjustment' | 'reversal'
export type StockMovementStatus = 'draft' | 'verified' | 'posted' | 'cancelled'
export type StockSerializationMode = 'partial' | 'full' | 'single'
export type StockSerializationStatus = 'draft' | 'partial' | 'verified' | 'posted'
export type StockBarcodeMode = 'readable' | 'numeric'

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
  created_at: Date
  updated_at: Date
  deleted_at: Date | null
  generated_quantity: number
  verified_quantity: number
  posted_quantity: number
  serializations: StockSerialization[]
}

export interface StockLedgerSettings {
  id: number
  uuid: string
  tenant_id: number
  company_id: number
  serialization_enabled: boolean
  batch_enabled: boolean
  default_warehouse_id: string | null
  default_warehouse_name: string | null
  serial_format: string
  batch_format: string
  barcode_format: string
  barcode_mode: StockBarcodeMode
  created_at: Date
  updated_at: Date
}

export interface StockLedgerMovement {
  id: number
  uuid: string
  tenant_id: number
  company_id: number
  accounting_year_id: number
  warehouse_id: string | null
  warehouse_name: string | null
  product_id: string | null
  product_code: string | null
  product_name: string
  source_type: string
  source_id: string | null
  source_uuid: string | null
  source_no: string | null
  source_date: string | null
  direction: StockMovementDirection
  quantity_in: number
  quantity_out: number
  batch_no: string | null
  serial_no: string | null
  barcode_value: string | null
  status: StockMovementStatus
  actor_email: string
  created_at: Date
}

export interface StockLiveBalance {
  id: number
  uuid: string
  tenant_id: number
  company_id: number
  accounting_year_id: number
  warehouse_id: string | null
  warehouse_name: string | null
  product_id: string | null
  product_code: string | null
  product_name: string
  batch_no: string | null
  serial_no: string | null
  barcode_value: string | null
  quantity_on_hand: number
  quantity_reserved: number
  quantity_available: number
  last_movement_id: number | null
  updated_at: Date
}

export interface StockSerialization {
  id: number
  uuid: string
  stock_ledger_entry_id: number | null
  tenant_id: number
  company_id: number
  accounting_year_id: number
  purchase_receipt_id: number
  purchase_receipt_uuid: string
  purchase_receipt_no: string
  purchase_receipt_date: string
  purchase_receipt_item_id: number
  purchase_receipt_item_uuid: string | null
  product_id: string | null
  product_code: string | null
  product_name: string
  warehouse_id: string | null
  warehouse_name: string | null
  expected_quantity: number
  generated_quantity: number
  verified_quantity: number
  pending_quantity: number
  mode: StockSerializationMode
  batch_no: string | null
  serial_format: string
  barcode_format: string
  barcode_mode: StockBarcodeMode
  status: StockSerializationStatus
  created_by: string
  created_at: Date
  updated_at: Date
  items: StockSerializationItem[]
}

export interface StockSerializationItem {
  id: number
  uuid: string
  serialization_id: number
  serial_no: string
  batch_no: string | null
  barcode_value: string
  quantity: number
  is_verified: boolean
  verified_at: Date | null
  verified_by: string | null
  stock_movement_id: number | null
  created_at: Date
}
