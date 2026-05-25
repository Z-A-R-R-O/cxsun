import { apiBaseUrl, authHeaders, type AuthSession } from "src/features/auth/auth-client"
import type { TenantRecord, TenantUpsertInput } from "../domain/tenant"

interface TenantApiRecord {
  id: number
  code: number
  corporate_id: string | null
  mobile: string | null
  slug: string
  name: string
  status: "active" | "not_active" | "suspend"
  db_type: string
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

interface TenantUpsertResult {
  ok: boolean
  tenant?: TenantApiRecord
  error?: string
}

const tenantApiPath = "/api/v1/tenants"

export async function listTenants(session: AuthSession, options?: { signal?: AbortSignal }) {
  const response = await fetch(`${apiBaseUrl}${tenantApiPath}`, {
    cache: "no-store",
    headers: authHeaders(session),
    signal: options?.signal,
  })

  if (!response.ok) {
    throw new Error(`Tenant list request failed with status ${response.status}.`)
  }

  const records = (await response.json()) as TenantApiRecord[]
  return records.map(toTenantRecord)
}

export async function upsertTenant(session: AuthSession, input: TenantUpsertInput) {
  const response = await fetch(`${apiBaseUrl}${tenantApiPath}/upsert`, {
    body: JSON.stringify(input),
    cache: "no-store",
    headers: {
      ...authHeaders(session),
      "Content-Type": "application/json",
    },
    method: "POST",
  })

  if (!response.ok) {
    throw new Error(`Tenant save request failed with status ${response.status}.`)
  }

  const result = (await response.json()) as TenantUpsertResult

  if (!result.ok || !result.tenant) {
    throw new Error(result.error ?? "Tenant save failed.")
  }

  return toTenantRecord(result.tenant)
}

export async function softDeleteTenant(session: AuthSession, tenantId: number) {
  const response = await fetch(`${apiBaseUrl}${tenantApiPath}/${tenantId}/destroy`, {
    body: "{}",
    cache: "no-store",
    headers: {
      ...authHeaders(session),
      "Content-Type": "application/json",
    },
    method: "POST",
  })

  if (!response.ok) {
    throw new Error(`Tenant delete request failed with status ${response.status}.`)
  }

  const result = (await response.json()) as { ok: boolean; error?: string }

  if (!result.ok) {
    throw new Error(result.error ?? "Tenant delete failed.")
  }
}

export async function restoreTenant(session: AuthSession, tenantId: number) {
  const response = await fetch(`${apiBaseUrl}${tenantApiPath}/${tenantId}/restore`, {
    body: "{}",
    cache: "no-store",
    headers: {
      ...authHeaders(session),
      "Content-Type": "application/json",
    },
    method: "POST",
  })

  if (!response.ok) {
    throw new Error(`Tenant restore request failed with status ${response.status}.`)
  }

  const result = (await response.json()) as { ok: boolean; error?: string }

  if (!result.ok) {
    throw new Error(result.error ?? "Tenant restore failed.")
  }
}

function toTenantRecord(record: TenantApiRecord): TenantRecord {
  return {
    id: record.id,
    code: record.code,
    corporateId: record.corporate_id ?? "",
    mobile: record.mobile,
    slug: record.slug,
    name: record.name,
    status: record.status,
    dbType: record.db_type,
    dbHost: record.db_host,
    dbPort: record.db_port,
    dbName: record.db_name,
    dbUser: record.db_user,
    dbSecretRef: record.db_secret_ref,
    companyCount: Number(record.company_count ?? 0),
    activeCompanyCount: Number(record.active_company_count ?? 0),
    companyConceptCount: Number(record.company_concept_count ?? 0),
    payloadSettings: record.payload_settings,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
    deletedAt: record.deleted_at,
  }
}
