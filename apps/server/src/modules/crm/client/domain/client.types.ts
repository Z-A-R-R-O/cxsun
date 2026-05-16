export type ClientStatus = 'active' | 'inactive' | 'suspend'

export interface ClientRecord {
  id: number
  name: string
  company_name: string | null
  category: string | null
  source: string | null
  phone: string | null
  email: string | null
  location: string | null
  notes: string
  status: ClientStatus
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface ClientUpsertInput {
  id?: number
  name: string
  company_name?: string | null
  category?: string | null
  source?: string | null
  phone?: string | null
  email?: string | null
  location?: string | null
  notes?: string | null
  status?: ClientStatus
}
