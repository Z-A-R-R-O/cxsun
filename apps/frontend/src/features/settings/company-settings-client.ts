import { apiBaseUrl, authHeaders, type AuthSession } from "src/features/auth/auth-client"

export type CompanySettingKey = "apps" | "software" | "mail"

export interface CompanySettingRecord<TValues> {
  companyId: string
  key: CompanySettingKey
  values: TValues
  updatedAt: string
}

export async function getCompanySetting<TValues>(
  session: AuthSession,
  key: CompanySettingKey,
  companyId?: string | number | null,
  options?: { signal?: AbortSignal },
) {
  const params = companyId ? `?companyId=${encodeURIComponent(String(companyId))}` : ""
  const response = await fetch(`${apiBaseUrl}/api/v1/company-settings/${key}${params}`, {
    cache: "no-store",
    headers: authHeaders(session),
    signal: options?.signal,
  })

  if (!response.ok) {
    throw new Error(`Company setting request failed with status ${response.status}.`)
  }

  return (await response.json()) as CompanySettingRecord<TValues>
}

export async function saveCompanySetting<TValues>(
  session: AuthSession,
  key: CompanySettingKey,
  values: TValues,
  companyId?: string | number | null,
  options?: { signal?: AbortSignal },
) {
  const params = companyId ? `?companyId=${encodeURIComponent(String(companyId))}` : ""
  const response = await fetch(`${apiBaseUrl}/api/v1/company-settings/${key}${params}`, {
    body: JSON.stringify({ values }),
    cache: "no-store",
    headers: {
      ...authHeaders(session),
      "Content-Type": "application/json",
    },
    method: "PATCH",
    signal: options?.signal,
  })

  if (!response.ok) {
    throw new Error(`Company setting save failed with status ${response.status}.`)
  }

  return (await response.json()) as CompanySettingRecord<TValues>
}

