import { apiBaseUrl, authHeaders, type AuthSession } from "src/features/auth/auth-client"

export interface EcommerceSettings {
  id: number
  uuid: string
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
  is_active: boolean | number
}

export interface EcommerceProductPublication {
  id: number
  uuid: string
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
  is_featured: boolean | number
  published_at: string | null
  updated_at: string
}

export interface EcommerceCustomerProfile {
  id: number
  uuid: string
  contact_id: number
  contact_code: string | null
  contact_name: string | null
  customer_no: string
  portal_status: string
  login_email: string | null
  login_phone: string | null
  marketing_opt_in: boolean | number
  order_count: number
  total_spend: number
  updated_at: string
}

export interface EcommerceOrder {
  id: number
  uuid: string
  order_no: string
  contact_id: number | null
  customer_profile_id: number | null
  contact_name: string | null
  status: string
  payment_status: string
  fulfillment_status: string
  grand_total: number
  sales_entry_uuid: string | null
  updated_at: string
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

export type EcommerceView =
  | "dashboard"
  | "orders"
  | "carts"
  | "checkout"
  | "products"
  | "categories"
  | "collections"
  | "variants"
  | "customers"
  | "customer-dashboard"
  | "customer-portal"
  | "wishlists"
  | "reviews"
  | "shipping"
  | "delivery-zones"
  | "returns"
  | "coupons"
  | "campaigns"
  | "seo"
  | "sales-report"
  | "product-report"
  | "customer-report"
  | "settings"
  | "payment-gateway"
  | "tax-settings"

export async function getEcommerceWorkspace(session: AuthSession) {
  const response = await fetch(`${apiBaseUrl}/api/v1/ecommerce`, { cache: "no-store", headers: authHeaders(session) })
  if (!response.ok) throw new Error(`Ecommerce workspace failed with status ${response.status}.`)
  return (await response.json()) as EcommerceWorkspace
}

export async function saveEcommerceSettings(session: AuthSession, input: Partial<EcommerceSettings>) {
  return ecommerceRequest(session, "settings", input, "Store settings save failed", "PATCH")
}

export async function upsertEcommerceProduct(session: AuthSession, input: Partial<EcommerceProductPublication>) {
  return ecommerceRequest(session, "products/upsert", input, "Product publication save failed")
}

export async function upsertEcommerceCustomer(session: AuthSession, input: Partial<EcommerceCustomerProfile>) {
  return ecommerceRequest(session, "customers/upsert", input, "Customer profile save failed")
}

async function ecommerceRequest(session: AuthSession, path: string, input: unknown, fallback: string, method = "POST") {
  const response = await fetch(`${apiBaseUrl}/api/v1/ecommerce/${path}`, {
    body: JSON.stringify(input),
    cache: "no-store",
    headers: { ...authHeaders(session), "Content-Type": "application/json" },
    method,
  })
  if (!response.ok) throw new Error(`${fallback} with status ${response.status}.`)
  const result = (await response.json()) as { ok: boolean; workspace?: EcommerceWorkspace; error?: string }
  if (!result.ok || !result.workspace) throw new Error(result.error ?? fallback)
  return result.workspace
}

export function emptyProductPublication(): Partial<EcommerceProductPublication> {
  return { product_id: 0, category_id: null, title: "", slug: "", short_description: "", status: "draft", visibility: "public", sale_price: 0, compare_at_price: 0, stock_status: "in_stock", is_featured: false }
}

export function emptyCustomerProfile(): Partial<EcommerceCustomerProfile> {
  return { contact_id: 0, customer_no: "", portal_status: "invited", login_email: "", login_phone: "", marketing_opt_in: false }
}
