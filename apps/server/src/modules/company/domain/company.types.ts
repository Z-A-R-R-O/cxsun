export type CompanyStatus = 'active' | 'not_active' | 'suspend'

export interface Company {
  id: number
  name: string
  status: CompanyStatus
  settings: Record<string, unknown>
  features: string[]
  created_at?: Date
  updated_at?: Date
  deleted_at?: Date | null
}

export interface CompanyUpsertInput {
  id?: number
  name: string
  status?: CompanyStatus
  settings?: Record<string, unknown>
  features?: string[]
}

