import { apiBaseUrl, authHeaders, type AuthSession } from "src/features/auth/auth-client"

export interface TallySettings {
  id: number
  uuid: string
  tenant_id: number
  company_id: number | null
  enabled: boolean | number
  tally_host: string
  tally_port: number
  company_name: string | null
  sync_sales: boolean | number
  sync_purchase: boolean | number
  sync_receipt: boolean | number
  sync_payment: boolean | number
  sync_inventory: boolean | number
  sync_contacts: boolean | number
  sync_direction: string
  settings: string | null
  updated_by: string | null
  created_at: string
  updated_at: string
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
  started_at: string | null
  finished_at: string | null
  total_records: number
  success_count: number
  failed_count: number
  error_message: string | null
  payload: string | null
  created_at: string
  updated_at: string
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
  created_at: string
  updated_at: string
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

export type TallySyncResource = "contacts" | "products" | "sales" | "purchase"

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

export type TallySettingsInput = Omit<Partial<TallySettings>, "settings"> & { settings?: unknown }

export async function getTallyWorkspace(session: AuthSession) {
  const response = await fetch(`${apiBaseUrl}/api/v1/tally`, {
    cache: "no-store",
    headers: authHeaders(session),
  })
  if (!response.ok) throw new Error(`Tally workspace failed with status ${response.status}.`)
  return (await response.json()) as TallyWorkspace
}

export async function saveTallySettings(session: AuthSession, input: TallySettingsInput) {
  const response = await fetch(`${apiBaseUrl}/api/v1/tally/settings`, {
    body: JSON.stringify(input),
    cache: "no-store",
    headers: { ...authHeaders(session), "Content-Type": "application/json" },
    method: "POST",
  })
  if (!response.ok) throw new Error(await responseErrorMessage(response, "Tally settings save failed"))
  return (await response.json()) as { ok: boolean; settings: TallySettings; workspace: TallyWorkspace }
}

export async function validateTallyConnection(session: AuthSession, input: TallySettingsInput) {
  const response = await fetch(`${apiBaseUrl}/api/v1/tally/validate-connection`, {
    body: JSON.stringify(input),
    cache: "no-store",
    headers: { ...authHeaders(session), "Content-Type": "application/json" },
    method: "POST",
  })
  if (!response.ok) throw new Error(await responseErrorMessage(response, "Tally connection validation failed"))
  return (await response.json()) as { ok: boolean; validation: TallyConnectionValidation; settings: TallySettings; workspace: TallyWorkspace }
}

export async function createTallySyncJob(session: AuthSession, input: { job_type?: string; direction?: string; payload?: unknown } = {}) {
  const response = await fetch(`${apiBaseUrl}/api/v1/tally/sync-jobs`, {
    body: JSON.stringify(input),
    cache: "no-store",
    headers: { ...authHeaders(session), "Content-Type": "application/json" },
    method: "POST",
  })
  if (!response.ok) throw new Error(await responseErrorMessage(response, "Tally sync job failed"))
  return (await response.json()) as { ok: boolean; workspace: TallyWorkspace }
}

export async function getTallySyncList<TRecord>(
  session: AuthSession,
  resource: TallySyncResource,
  query: { search?: string; status?: string; classification?: string } = {},
) {
  const url = new URL(`${apiBaseUrl}/api/v1/tally/sync/${resource}`)
  for (const [key, value] of Object.entries(query)) {
    if (!value) continue
    url.searchParams.set(key, value)
  }
  const response = await fetch(url.toString(), {
    cache: "no-store",
    headers: authHeaders(session),
  })
  if (!response.ok) throw new Error(await responseErrorMessage(response, "Tally sync list failed"))
  return (await response.json()) as { resource: TallySyncResource; rows: TRecord[] }
}

export async function runTallySync(session: AuthSession, resource: TallySyncResource, ids: string[]) {
  const response = await fetch(`${apiBaseUrl}/api/v1/tally/sync/${resource}`, {
    body: JSON.stringify({ ids }),
    cache: "no-store",
    headers: { ...authHeaders(session), "Content-Type": "application/json" },
    method: "POST",
  })
  if (!response.ok) throw new Error(await responseErrorMessage(response, "Tally sync action failed"))
  return (await response.json()) as { ok: boolean; summary: Record<string, number> }
}

async function responseErrorMessage(response: Response, fallback: string) {
  try {
    const payload = (await response.json()) as { error?: string; message?: string }
    return payload.error || payload.message || `${fallback} with status ${response.status}.`
  } catch {
    return `${fallback} with status ${response.status}.`
  }
}
