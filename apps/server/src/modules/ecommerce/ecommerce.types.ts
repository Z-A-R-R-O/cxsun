export interface EcommerceSettings {
  id: number
  uuid: string
  tenant_id: number
  store_name: string
  store_status: string
  default_tax_mode: string
  order_prefix: string
  public_contact_email: string | null
  public_contact_phone: string | null
  return_policy: string | null
  shipping_policy: string | null
  privacy_policy: string | null
  terms: string | null
  is_active: boolean
  created_at: Date | string
  updated_at: Date | string
  deleted_at: Date | string | null
}

export interface EcommerceProductPublication {
  id: number
  uuid: string
  tenant_id: number
  product_id: number
  category_id: number | null
  product_code: string | null
  product_name: string | null
  category_name: string | null
  slug: string
  title: string
  short_description: string | null
  status: string
  visibility: string
  sale_price: number
  compare_at_price: number
  stock_status: string
  is_featured: boolean
  published_at: Date | string | null
  created_at: Date | string
  updated_at: Date | string
  deleted_at: Date | string | null
}

export interface EcommerceCustomerProfile {
  id: number
  uuid: string
  tenant_id: number
  contact_id: number
  contact_code: string | null
  contact_name: string | null
  customer_no: string
  portal_status: string
  login_email: string | null
  login_phone: string | null
  marketing_opt_in: boolean
  order_count: number
  total_spend: number
  created_at: Date | string
  updated_at: Date | string
  deleted_at: Date | string | null
}

export interface EcommerceOrder {
  id: number
  uuid: string
  tenant_id: number
  order_no: string
  contact_id: number | null
  customer_profile_id: number | null
  contact_name: string | null
  status: string
  payment_status: string
  fulfillment_status: string
  grand_total: number
  sales_entry_uuid: string | null
  created_at: Date | string
  updated_at: Date | string
  deleted_at: Date | string | null
}

export interface EcommerceWorkspace {
  settings: EcommerceSettings
  products: EcommerceProductPublication[]
  customers: EcommerceCustomerProfile[]
  orders: EcommerceOrder[]
  carts: Record<string, unknown>[]
  shipments: Record<string, unknown>[]
  returns: Record<string, unknown>[]
  coupons: Record<string, unknown>[]
  reviews: Record<string, unknown>[]
  wishlists: Record<string, unknown>[]
  portalAccounts: Record<string, unknown>[]
  dashboard: {
    publishedProducts: number
    draftProducts: number
    activeCustomers: number
    openOrders: number
    paidOrders: number
    revenue: number
    activeCarts: number
    pendingReturns: number
  }
  source: {
    productCount: number
    contactCount: number
    categoryCount: number
  }
}

export type EcommerceSettingsInput = Partial<Pick<EcommerceSettings, 'store_name' | 'store_status' | 'default_tax_mode' | 'order_prefix' | 'public_contact_email' | 'public_contact_phone' | 'return_policy' | 'shipping_policy' | 'privacy_policy' | 'terms' | 'is_active'>>

export interface EcommerceProductInput {
  id?: number
  uuid?: string
  product_id?: number
  category_id?: number | null
  slug?: string
  title?: string
  short_description?: string | null
  status?: string
  visibility?: string
  sale_price?: number
  compare_at_price?: number
  stock_status?: string
  is_featured?: boolean
}

export interface EcommerceCustomerInput {
  id?: number
  uuid?: string
  contact_id?: number
  customer_no?: string
  portal_status?: string
  login_email?: string | null
  login_phone?: string | null
  marketing_opt_in?: boolean
}
