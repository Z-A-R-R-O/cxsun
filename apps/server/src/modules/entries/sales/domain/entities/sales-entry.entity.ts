export interface SalesEntryItem {
  id: number
  uuid: string
  sales_entry_id: number
  product_id: string | null
  product_name: string
  description: string | null
  hsn_code: string | null
  unit: string | null
  quantity: number
  rate: number
  discount_amount: number
  tax_rate: number
  tax_amount: number
  line_total: number
  sort_order: number
}

export interface SalesEntryComment {
  id: number
  uuid: string
  sales_entry_id: number
  author_email: string
  body: string
  created_at: Date | string
}

export interface SalesEntryActivity {
  id: number
  uuid: string
  sales_entry_id: number
  activity_type: string
  actor_email: string
  message: string
  payload: string
  created_at: Date | string
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
  created_at: Date | string
  updated_at: Date | string
  deleted_at: Date | string | null
  items: SalesEntryItem[]
  comments: SalesEntryComment[]
  activities: SalesEntryActivity[]
}
