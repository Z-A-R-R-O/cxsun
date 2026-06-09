export type TirupurConnectStatus = 'active' | 'draft' | 'paused'

export interface TirupurConnectSettings {
  status: TirupurConnectStatus
  platformName: string
  tagline: string
  positioning: string
}

export interface TirupurConnectOverview {
  settings: TirupurConnectSettings
  mode: 'marketplace' | 'client'
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

export interface TirupurConnectSupplierProfileInput {
  contactId?: number | string
  brandName?: string
  businessType?: string
  about?: string
  factoryAddress?: string
  monthlyCapacity?: string
  minOrderQty?: number | string
  status?: string
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

export interface TirupurConnectBuyerCompanyInput {
  contactId?: number | string
  buyerType?: string
  annualVolume?: string
  description?: string
  status?: string
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

export interface TirupurConnectProductInput {
  productId?: number | string
  supplierProfileId?: number | string
  slug?: string
  description?: string
  moq?: number | string
  leadTime?: string
  fabricDetails?: string
  certificationDetails?: string
  status?: string
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

export interface TirupurConnectRfqInput {
  buyerCompanyId?: number | string
  title?: string
  description?: string
  quantity?: number | string
  deliveryDeadline?: string
  budgetMin?: number | string
  budgetMax?: number | string
  status?: string
}

export interface TirupurConnectPublicRfq {
  id: number
  uuid: string
  title: string
  description: string | null
  quantity: number
  deliveryDeadline: string | null
  budgetMin: number | null
  budgetMax: number | null
  status: string
  createdAt: string
}

export interface TirupurConnectPublicInquiryInput {
  entityType?: string
  entityUuid?: string
  sourceTenantSlug?: string
  buyerName?: string
  companyName?: string
  email?: string
  phone?: string
  message?: string
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

export interface TirupurConnectSupplierPublicationDetail extends TirupurConnectSupplierPublication {
  about: string | null
  factoryAddress: string | null
  verificationLevel: string
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

export interface TirupurConnectProductPublicationDetail extends TirupurConnectProductPublication {
  fabricDetails: string | null
  certificationDetails: string | null
}
