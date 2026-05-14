import { apiBaseUrl, authHeaders, type AuthSession } from "src/features/auth/auth-client"

export interface CompanyRecord {
  id: number
  name: string
  status: "active" | "not_active" | "suspend"
  settings: Record<string, unknown>
  features: string[]
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export async function listCompanies(session: AuthSession) {
  const response = await fetch(`${apiBaseUrl}/api/v1/companies`, {
    cache: "no-store",
    headers: authHeaders(session),
  })

  if (!response.ok) {
    throw new Error(`Company list failed with status ${response.status}.`)
  }

  return (await response.json()) as CompanyRecord[]
}

export async function upsertCompany(session: AuthSession, input: { id?: number; name: string }) {
  const response = await fetch(`${apiBaseUrl}/api/v1/companies/upsert`, {
    body: JSON.stringify({
      id: input.id,
      name: input.name,
      status: "active",
      settings: { timezone: "Asia/Calcutta", currency: "INR" },
      features: ["company.manage"],
    }),
    cache: "no-store",
    headers: {
      ...authHeaders(session),
      "Content-Type": "application/json",
    },
    method: "POST",
  })

  if (!response.ok) {
    throw new Error(`Company save failed with status ${response.status}.`)
  }

  const result = (await response.json()) as { ok: boolean; company?: CompanyRecord; error?: string }

  if (!result.ok || !result.company) {
    throw new Error(result.error ?? "Company save failed.")
  }

  return result.company
}

export async function destroyCompany(session: AuthSession, id: number) {
  await mutateCompany(session, id, "destroy")
}

export async function restoreCompany(session: AuthSession, id: number) {
  await mutateCompany(session, id, "restore")
}

async function mutateCompany(session: AuthSession, id: number, action: "destroy" | "restore") {
  const response = await fetch(`${apiBaseUrl}/api/v1/companies/${id}/${action}`, {
    body: "{}",
    cache: "no-store",
    headers: {
      ...authHeaders(session),
      "Content-Type": "application/json",
    },
    method: "POST",
  })

  if (!response.ok) {
    throw new Error(`Company ${action} failed with status ${response.status}.`)
  }

  const result = (await response.json()) as { ok: boolean; error?: string }

  if (!result.ok) {
    throw new Error(result.error ?? `Company ${action} failed.`)
  }
}
