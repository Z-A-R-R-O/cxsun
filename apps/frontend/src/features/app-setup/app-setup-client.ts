import { apiBaseUrl, authHeaders, type AuthSession } from "src/features/auth/auth-client"

export interface AppSetupInput {
  code: string
  name: string
  slug: string
  database: string
  dbServerMode: "same" | "other"
  dbHost: string
  dbPort: string
  dbUser: string
  dbSecretRef: string
  domain: string
  adminName: string
  adminEmail: string
  adminPassword: string
}

export interface AppSetupResult {
  ok: boolean
  error?: string
  tenant?: {
    id: number
    code: number
    name: string
    slug: string
    db_host: string
    db_port: number
    db_name: string
    db_user: string
    db_secret_ref: string
  }
  domain?: {
    domain: string
    label: string
  }
}

export async function createAppSetup(session: AuthSession, input: AppSetupInput) {
  const response = await fetch(`${apiBaseUrl}/api/v1/setup/apps`, {
    body: JSON.stringify(input),
    cache: "no-store",
    headers: {
      ...authHeaders(session),
      "Content-Type": "application/json",
    },
    method: "POST",
  })

  if (!response.ok) {
    throw new Error(`Tenant setup request failed with status ${response.status}.`)
  }

  const result = (await response.json()) as AppSetupResult
  if (!result.ok) {
    throw new Error(result.error ?? "Tenant setup failed.")
  }

  return result
}
