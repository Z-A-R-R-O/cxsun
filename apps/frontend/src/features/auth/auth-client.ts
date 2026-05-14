export interface AuthTenant {
  id: number
  code: number
  slug: string
  name: string
  status: string
  role: string
}

export interface AuthSession {
  token: string
  user: { id: number; name: string; email: string }
  tenants: AuthTenant[]
  selectedTenant: AuthTenant
}

const configuredApiBaseUrl =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:6001"
export const apiBaseUrl = configuredApiBaseUrl.replace(/\/api(\/v\d+)?\/?$/, "").replace(/\/$/, "")
const sessionKey = "cxsun.auth.session"

export function getStoredSession(): AuthSession | null {
  try {
    const value = localStorage.getItem(sessionKey)
    return value ? (JSON.parse(value) as AuthSession) : null
  } catch {
    return null
  }
}

export function storeSession(session: AuthSession) {
  localStorage.setItem(sessionKey, JSON.stringify(session))
}

export function clearSession() {
  localStorage.removeItem(sessionKey)
}

export function switchTenant(session: AuthSession, tenantSlug: string): AuthSession {
  const selectedTenant = session.tenants.find((tenant) => tenant.slug === tenantSlug)

  if (!selectedTenant) {
    return session
  }

  const nextSession = { ...session, selectedTenant }
  storeSession(nextSession)
  return nextSession
}

export function authHeaders(session: AuthSession) {
  return {
    Accept: "application/json",
    Authorization: `Bearer ${session.token}`,
    "x-tenant-code": session.selectedTenant.slug,
  }
}

export async function login(input: { email: string; password: string; tenantCode?: string }) {
  const response = await fetch(`${apiBaseUrl}/api/v1/auth/login`, {
    body: JSON.stringify(input),
    cache: "no-store",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    method: "POST",
  })

  if (!response.ok) {
    throw new Error(`Login request failed with status ${response.status}.`)
  }

  const result = (await response.json()) as ({ ok: true } & AuthSession) | { ok: false; error?: string }

  if (!result.ok) {
    throw new Error(result.error ?? "Login failed.")
  }

  storeSession(result)
  return result
}
