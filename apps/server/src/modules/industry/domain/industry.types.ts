export interface Industry {
  id: number
  code: string
  name: string
  status: 'active' | 'not_active' | 'suspend'
  payload_schema: string
  default_features: string
  default_ui_settings: string
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface IndustryUpsertInput {
  id?: number
  code: string
  name: string
  status?: 'active' | 'not_active' | 'suspend'
  payload_schema?: Record<string, unknown>
  default_features?: string[]
  default_ui_settings?: Record<string, unknown>
}
