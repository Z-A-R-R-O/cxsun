import { apiBaseUrl, authHeaders, type AuthSession } from "src/features/auth/auth-client"

export interface AuditorGstFilingRecord {
  id: number
  uuid: string
  contactId: number
  contactName: string
  monthId: string | null
  monthName: string
  accountingYearId: string | null
  accountingYearName: string
  gstr1Arn: string | null
  gstr1Date: string | null
  gstr3bArn: string | null
  gstr3bDate: string | null
  status: string
  isActive: boolean
}

export interface AuditorGstFilingInput {
  id?: number
  uuid?: string
  contactId: number
  contactName: string
  monthId: string | null
  monthName: string
  accountingYearId: string | null
  accountingYearName: string
  gstr1Arn: string
  gstr1Date: string
  gstr3bArn: string
  gstr3bDate: string
  status: string
  isActive: boolean
}

type RawAuditorGstFiling = Partial<AuditorGstFilingRecord> & {
  [key: string]: unknown
  contact_id?: unknown
  contact_name?: unknown
  client_id?: unknown
  client_name?: unknown
  month_id?: unknown
  month_name?: unknown
  accounting_year_id?: unknown
  accounting_year_name?: unknown
  gstr1_arn?: unknown
  gstr1_date?: unknown
  gstr3b_arn?: unknown
  gstr3b_date?: unknown
  is_active?: unknown
}

export async function listAuditorGstFilings(session: AuthSession, filters: { contactId?: number; monthName?: string; accountingYearName?: string }) {
  const query = new URLSearchParams()
  if (filters.contactId) query.set("contactId", String(filters.contactId))
  if (filters.monthName) query.set("monthName", filters.monthName)
  if (filters.accountingYearName) query.set("accountingYearName", filters.accountingYearName)
  const response = await fetch(`${apiBaseUrl}/api/v1/auditor/gst-filings?${query}`, { cache: "no-store", headers: authHeaders(session) })
  if (!response.ok) throw new Error(`GST filing list failed with status ${response.status}.`)
  return ((await response.json()) as RawAuditorGstFiling[]).map(normalizeAuditorGstFiling)
}

export async function upsertAuditorGstFiling(session: AuthSession, input: AuditorGstFilingInput) {
  const response = await fetch(`${apiBaseUrl}/api/v1/auditor/gst-filings/upsert`, {
    body: JSON.stringify(input),
    cache: "no-store",
    headers: { ...authHeaders(session), "Content-Type": "application/json" },
    method: "POST",
  })
  if (!response.ok) throw new Error(await responseError(response, `GST filing save failed with status ${response.status}.`))
  const result = await response.json() as { ok: boolean; record?: RawAuditorGstFiling; error?: string }
  if (!result.ok || !result.record) throw new Error(result.error ?? "GST filing save failed.")
  return normalizeAuditorGstFiling(result.record)
}

export async function deleteAuditorGstFiling(session: AuthSession, record: AuditorGstFilingRecord) {
  const response = await fetch(`${apiBaseUrl}/api/v1/auditor/gst-filings/${encodeURIComponent(record.uuid)}/destroy`, {
    body: "{}",
    cache: "no-store",
    headers: { ...authHeaders(session), "Content-Type": "application/json" },
    method: "POST",
  })
  if (!response.ok) throw new Error(await responseError(response, "GST filing delete failed."))
}

export function normalizeAuditorGstFiling(record: RawAuditorGstFiling): AuditorGstFilingRecord {
  return {
    id: Number(record.id ?? 0),
    uuid: String(record.uuid ?? ""),
    contactId: Number(record.contactId ?? record.contact_id ?? record.clientId ?? record.client_id ?? 0),
    contactName: String(record.contactName ?? record.contact_name ?? record.clientName ?? record.client_name ?? ""),
    monthId: nullableString(record.monthId ?? record.month_id),
    monthName: String(record.monthName ?? record.month_name ?? ""),
    accountingYearId: nullableString(record.accountingYearId ?? record.accounting_year_id),
    accountingYearName: String(record.accountingYearName ?? record.accounting_year_name ?? ""),
    gstr1Arn: nullableString(record.gstr1Arn ?? record.gstr1_arn),
    gstr1Date: dateString(record.gstr1Date ?? record.gstr1_date),
    gstr3bArn: nullableString(record.gstr3bArn ?? record.gstr3b_arn),
    gstr3bDate: dateString(record.gstr3bDate ?? record.gstr3b_date),
    status: String(record.status ?? "pending"),
    isActive: booleanValue(record.isActive ?? record.is_active, true),
  }
}

function nullableString(value: unknown) {
  return value === null || value === undefined || value === "" ? null : String(value)
}

function dateString(value: unknown) {
  const text = nullableString(value)
  return text ? text.slice(0, 10) : null
}

function booleanValue(value: unknown, fallback = false) {
  if (value === null || value === undefined || value === "") return fallback
  if (typeof value === "string") return value !== "0" && value.toLowerCase() !== "false"
  return Boolean(value)
}

async function responseError(response: Response, fallback: string) {
  try {
    const body = await response.json() as { error?: string }
    return body.error ?? fallback
  } catch {
    return fallback
  }
}
