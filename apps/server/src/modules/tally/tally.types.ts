export interface TallySettings {
  id: number
  uuid: string
  tenant_id: number
  company_id: number | null
  enabled: boolean
  tally_host: string
  tally_port: number
  company_name: string | null
  sync_sales: boolean
  sync_purchase: boolean
  sync_receipt: boolean
  sync_payment: boolean
  sync_inventory: boolean
  sync_contacts: boolean
  sync_direction: string
  settings: string | null
  updated_by: string | null
  created_at: Date
  updated_at: Date
}

export interface TallySyncJob {
  id: number
  uuid: string
  tenant_id: number
  company_id: number | null
  job_type: string
  direction: string
  status: string
  requested_by: string
  started_at: Date | null
  finished_at: Date | null
  total_records: number
  success_count: number
  failed_count: number
  error_message: string | null
  payload: string | null
  created_at: Date
  updated_at: Date
}

export interface TallySyncItem {
  id: number
  uuid: string
  job_id: number
  module_key: string
  record_id: string | null
  record_uuid: string | null
  record_label: string | null
  tally_guid: string | null
  status: string
  error_message: string | null
  payload: string | null
  created_at: Date
  updated_at: Date
}

export interface TallyWorkspace {
  settings: TallySettings
  jobs: TallySyncJob[]
  items: TallySyncItem[]
}

export interface TallyConnectionValidation {
  ok: boolean
  endpoint: string
  requested_company: string
  matched_company: string | null
  available_companies: string[]
  checked_at: string
  http_status: number | null
  status: string | null
  line_error: string | null
  detail: string
  response_excerpt: string | null
}

export type TallySyncResource = 'contacts' | 'products' | 'sales' | 'purchase'

export interface TallySyncLink {
  id: number
  uuid: string
  tenant_id: number
  company_id: number | null
  module_key: string
  record_type: string
  record_id: string | null
  record_uuid: string
  record_label: string | null
  classification: string | null
  tally_name: string | null
  tally_guid: string | null
  status: string
  last_synced_at: Date | null
  last_error: string | null
  payload: string | null
  updated_by: string | null
  created_at: Date
  updated_at: Date
}

export interface TallySyncQuery {
  search?: string
  status?: string
  classification?: string
}

export interface TallySyncActionInput {
  ids?: string[]
}

export interface TallyContactSyncRow {
  id: number
  uuid: string
  code: string
  name: string
  legal_name: string | null
  contact_type: string | null
  ledger_name: string | null
  classification: string
  tally_group: string | null
  gstin: string | null
  address: string | null
  phone: string | null
  email: string | null
  is_active: boolean
  sync_status: string
  synced_to_tally: boolean
  tally_name: string | null
  tally_guid: string | null
  last_synced_at: string | null
  last_error: string | null
}

export interface TallyProductSyncRow {
  id: number
  uuid: string
  code: string | null
  name: string
  product_type: string | null
  hsn_code: string | null
  unit: string | null
  tax_rate: string | null
  is_active: boolean
  sync_status: string
  synced_to_tally: boolean
  tally_name: string | null
  tally_guid: string | null
  last_synced_at: string | null
  last_error: string | null
}

export interface TallyEntrySyncRow {
  id: number
  uuid: string
  document_no: string
  document_date: string
  party_uuid: string | null
  party_name: string
  grand_total: number
  item_count: number
  is_active: boolean
  sync_status: string
  synced_to_tally: boolean
  tally_name: string | null
  tally_guid: string | null
  last_synced_at: string | null
  last_error: string | null
  prerequisite_status: string
  missing_masters: string[]
}

export interface TallySyncListResponse<TRecord> {
  resource: TallySyncResource
  rows: TRecord[]
}

export type TallySettingsInput = Omit<Partial<TallySettings>, 'settings'> & { settings?: unknown }
export type TallySyncJobInput = Omit<Partial<TallySyncJob>, 'payload'> & { payload?: unknown }
