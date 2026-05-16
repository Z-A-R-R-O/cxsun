export type TenantStatus = 'active' | 'not_active' | 'suspend'

export interface Tenant {
  id: number
  code: number
  slug: string
  name: string
  status: TenantStatus
  db_type: 'mariadb'
  db_host: string
  db_port: number
  db_name: string
  db_user: string
  db_secret_ref: string
  company_count: number
  active_company_count: number
  company_concept_count: number
  payload_settings: string
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface TenantUpsertInput {
  id?: number
  code?: number | null
  slug?: string | null
  name: string
  status: TenantStatus
  db_type?: 'mariadb' | null
  db_host?: string | null
  db_port?: number | null
  db_name?: string | null
  db_user?: string | null
  db_secret_ref?: string | null
  payload_settings?: string | null
}

export interface TenantUpsertData {
  code: number
  slug: string
  name: string
  status: TenantStatus
  db_type: 'mariadb'
  db_host: string
  db_port: number
  db_name: string
  db_user: string
  db_secret_ref: string
  payload_settings: string
}

export interface TenantDatabaseConfig {
  type: 'mariadb'
  host: string
  port: number
  database: string
  user: string
  secretRef: string
}
