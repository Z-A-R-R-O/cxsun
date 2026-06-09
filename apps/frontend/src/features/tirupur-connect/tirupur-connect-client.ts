import { apiBaseUrl, authHeaders, type AuthSession } from "src/features/auth/auth-client"

export type TirupurConnectStatus = "active" | "draft" | "paused"

export interface TirupurConnectSettings {
  platformName: string
  tagline: string
  positioning: string
  status: TirupurConnectStatus
}

export interface TirupurConnectOverview {
  settings: TirupurConnectSettings
  mode: "marketplace" | "client"
  counts: {
    buyers: number
    events: number
    messages: number
    news: number
    products: number
    rfqs: number
    suppliers: number
  }
}

export interface TirupurConnectSupplierProfile {
  id: number
  uuid: string
  contactId: number
  brandName: string | null
  businessType: string | null
  monthlyCapacity: string | null
  minOrderQty: number | null
  verificationLevel: string
  publicationStatus: string
  publishedAt: string | null
  status: string
  createdAt: string
}

export interface TirupurConnectBuyerCompany {
  id: number
  uuid: string
  contactId: number
  buyerType: string | null
  annualVolume: string | null
  description: string | null
  status: string
  createdAt: string
}

export interface TirupurConnectProduct {
  id: number
  uuid: string
  productId: number
  supplierProfileId: number
  slug: string
  description: string | null
  moq: number | null
  leadTime: string | null
  publicationStatus: string
  publishedAt: string | null
  status: string
  createdAt: string
}

export interface TirupurConnectRfq {
  id: number
  uuid: string
  buyerCompanyId: number
  title: string
  description: string | null
  quantity: number
  deliveryDeadline: string | null
  budgetMin: number | null
  budgetMax: number | null
  status: string
  createdAt: string
}

export interface TirupurConnectSupplierPublication {
  id: number
  uuid: string
  sourceTenantId: number
  sourceTenantSlug: string
  sourceSupplierUuid: string
  brandName: string | null
  businessType: string | null
  monthlyCapacity: string | null
  minOrderQty: number | null
  publicationStatus: string
  createdAt: string
  reviewedAt: string | null
}

export interface TirupurConnectProductPublication {
  id: number
  uuid: string
  sourceTenantId: number
  sourceTenantSlug: string
  sourceProductUuid: string
  sourceSupplierUuid: string | null
  slug: string
  description: string | null
  moq: number | null
  leadTime: string | null
  publicationStatus: string
  createdAt: string
  reviewedAt: string | null
}

export async function getTirupurConnectOverview(session: AuthSession) {
  const response = await fetch(`${apiBaseUrl}/api/v1/tirupur-connect`, {
    cache: "no-store",
    headers: authHeaders(session),
  })
  if (!response.ok) throw new Error(`Tirupur Connect overview failed with status ${response.status}.`)
  return (await response.json()) as TirupurConnectOverview
}

export async function saveTirupurConnectSettings(session: AuthSession, input: Partial<TirupurConnectSettings>) {
  const response = await fetch(`${apiBaseUrl}/api/v1/tirupur-connect/settings`, {
    body: JSON.stringify(input),
    cache: "no-store",
    headers: { ...authHeaders(session), "Content-Type": "application/json" },
    method: "POST",
  })
  if (!response.ok) throw new Error(`Tirupur Connect settings failed with status ${response.status}.`)
  const result = (await response.json()) as { ok: boolean; overview?: TirupurConnectOverview; error?: string }
  if (!result.ok || !result.overview) throw new Error(result.error ?? "Tirupur Connect settings failed.")
  return result.overview
}

export function listTirupurConnectSuppliers(session: AuthSession) {
  return listTirupurConnectRecords<TirupurConnectSupplierProfile>(session, "suppliers")
}

export function createTirupurConnectSupplier(session: AuthSession, input: Record<string, unknown>) {
  return createTirupurConnectRecord<TirupurConnectSupplierProfile>(session, "suppliers", input)
}

export function publishTirupurConnectSupplier(session: AuthSession, uuid: string) {
  return createTirupurConnectRecord<TirupurConnectSupplierProfile>(session, "suppliers/publish", { uuid })
}

export function listTirupurConnectBuyers(session: AuthSession) {
  return listTirupurConnectRecords<TirupurConnectBuyerCompany>(session, "buyers")
}

export function createTirupurConnectBuyer(session: AuthSession, input: Record<string, unknown>) {
  return createTirupurConnectRecord<TirupurConnectBuyerCompany>(session, "buyers", input)
}

export function listTirupurConnectProducts(session: AuthSession) {
  return listTirupurConnectRecords<TirupurConnectProduct>(session, "products")
}

export function createTirupurConnectProduct(session: AuthSession, input: Record<string, unknown>) {
  return createTirupurConnectRecord<TirupurConnectProduct>(session, "products", input)
}

export function publishTirupurConnectProduct(session: AuthSession, uuid: string) {
  return createTirupurConnectRecord<TirupurConnectProduct>(session, "products/publish", { uuid })
}

export function listTirupurConnectRfqs(session: AuthSession) {
  return listTirupurConnectRecords<TirupurConnectRfq>(session, "rfqs")
}

export function createTirupurConnectRfq(session: AuthSession, input: Record<string, unknown>) {
  return createTirupurConnectRecord<TirupurConnectRfq>(session, "rfqs", input)
}

export function listTirupurConnectSupplierPublications(session: AuthSession) {
  return listTirupurConnectRecords<TirupurConnectSupplierPublication>(session, "publications/suppliers")
}

export function reviewTirupurConnectSupplierPublication(session: AuthSession, input: { uuid: string; status: string }) {
  return createTirupurConnectRecord<TirupurConnectSupplierPublication>(session, "publications/suppliers/review", input)
}

export function listTirupurConnectProductPublications(session: AuthSession) {
  return listTirupurConnectRecords<TirupurConnectProductPublication>(session, "publications/products")
}

export function reviewTirupurConnectProductPublication(session: AuthSession, input: { uuid: string; status: string }) {
  return createTirupurConnectRecord<TirupurConnectProductPublication>(session, "publications/products/review", input)
}

async function listTirupurConnectRecords<T>(session: AuthSession, path: string) {
  const response = await fetch(`${apiBaseUrl}/api/v1/tirupur-connect/${path}`, {
    cache: "no-store",
    headers: authHeaders(session),
  })
  if (!response.ok) throw new Error(`Tirupur Connect ${path} request failed with status ${response.status}.`)
  const result = (await response.json()) as { ok: boolean; records?: T[]; error?: string }
  if (!result.ok || !result.records) throw new Error(result.error ?? `Tirupur Connect ${path} request failed.`)
  return result.records
}

async function createTirupurConnectRecord<T>(session: AuthSession, path: string, input: Record<string, unknown>) {
  const response = await fetch(`${apiBaseUrl}/api/v1/tirupur-connect/${path}`, {
    body: JSON.stringify(input),
    cache: "no-store",
    headers: { ...authHeaders(session), "Content-Type": "application/json" },
    method: "POST",
  })
  if (!response.ok) throw new Error(`Tirupur Connect ${path} save failed with status ${response.status}.`)
  const result = (await response.json()) as { ok: boolean; records?: T[]; error?: string }
  if (!result.ok || !result.records) throw new Error(result.error ?? `Tirupur Connect ${path} save failed.`)
  return result.records
}
