export interface ExportSalesEntryItem {
  id: number
  uuid: string
  export_sales_entry_id: number
  product_id: string | null
  product_name: string
  description: string | null
  colour: string | null
  hsn_code: string | null
  po_no: string | null
  dc_no: string | null
  size: string | null
  unit: string | null
  quantity: number
  rate: number
  discount_amount: number
  tax_rate: number
  tax_amount: number
  line_total: number
  sort_order: number
}

export interface ExportSalesEntryComment {
  id: number
  uuid: string
  export_sales_entry_id: number
  author_email: string
  body: string
  created_at: Date | string
}

export interface ExportSalesEntryActivity {
  id: number
  uuid: string
  export_sales_entry_id: number
  activity_type: string
  actor_email: string
  message: string
  payload: string
  created_at: Date | string
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
  ack_date: Date | string | null
  signed_qr: string | null
  eway_bill_no: string | null
  eway_bill_date: Date | string | null
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
  created_at: Date | string
  updated_at: Date | string
  deleted_at: Date | string | null
  items: ExportSalesEntryItem[]
  comments: ExportSalesEntryComment[]
  activities: ExportSalesEntryActivity[]
}




