export type TenantDomainStatus = 'active' | 'not_active' | 'suspend'

export interface TenantDomain {
  id: number
  tenant_id: number
  tenant_slug: string
  tenant_name: string
  domain: string
  label: string
  is_primary: number
  status: TenantDomainStatus
  settings: string
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface TenantDomainResolution {
  ok: boolean
  error?: string
  domain?: {
    id: number
    domain: string
    label: string
    isPrimary: boolean
    status: TenantDomainStatus
  }
  tenant?: {
    id: number
    code: number
    slug: string
    name: string
    status: string
    database: string
    settings: Record<string, unknown>
    features: string[]
  }
}

export interface TenantDomainUpsertInput {
  id?: number
  tenant_id?: number
  tenantId?: number
  domain?: string
  label?: string
  is_primary?: number | boolean
  isPrimary?: number | boolean
  status?: TenantDomainStatus
  settings?: string | Record<string, unknown>
}
