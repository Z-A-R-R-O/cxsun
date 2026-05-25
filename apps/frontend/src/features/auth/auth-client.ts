import { apiBaseUrl } from "src/lib/api-base-url"

export interface AuthTenant {
  id: number
  code: number
  corporate_id: string | null
  mobile: string | null
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

export type AuthSurface = "tenant" | "admin" | "super-admin"

export { apiBaseUrl }

function sessionKey(surface: AuthSurface = "tenant") {
  return `cxsun.auth.${surface}.session`
}

export function getStoredSession(surface: AuthSurface = "tenant"): AuthSession | null {
  try {
    const value = localStorage.getItem(sessionKey(surface))
    const session = value ? (JSON.parse(value) as AuthSession) : null
    if (!session || !isUsableToken(session.token)) {
      clearSession(surface)
      return null
    }
    return session
  } catch {
    clearSession(surface)
    return null
  }
}

export function storeSession(session: AuthSession, surface: AuthSurface = "tenant") {
  localStorage.setItem(sessionKey(surface), JSON.stringify(session))
}

export function clearSession(surface: AuthSurface = "tenant") {
  localStorage.removeItem(sessionKey(surface))
}

export function clearAllSessions() {
  clearSession("tenant")
  clearSession("admin")
  clearSession("super-admin")
}

export function notifyAuthInvalid() {
  clearAllSessions()
  window.dispatchEvent(new Event("cxsun:auth-invalid"))
}

function isUsableToken(token: string) {
  try {
    const body = token.split(".")[1] ?? ""
    const base64 = body.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(body.length / 4) * 4, "=")
    const payload = JSON.parse(atob(base64)) as { exp?: number; iat?: number }
    const now = Math.floor(Date.now() / 1000)
    return Boolean(payload.iat && payload.exp && payload.exp > now)
  } catch {
    return false
  }
}

export function switchTenant(
  session: AuthSession,
  tenantSlug: string,
  surface: AuthSurface = "tenant",
): AuthSession {
  const selectedTenant = session.tenants.find((tenant) => tenant.slug === tenantSlug)

  if (!selectedTenant) {
    return session
  }

  const nextSession = { ...session, selectedTenant }
  storeSession(nextSession, surface)
  return nextSession
}

export function authHeaders(session: AuthSession) {
  return {
    Accept: "application/json",
    Authorization: `Bearer ${session.token}`,
    "x-tenant-code": session.selectedTenant.slug,
  }
}

export function roleMatchesSurface(role: string, surface: AuthSurface): boolean {
  if (surface === "super-admin") return role === "super-admin"
  if (surface === "admin") return ["software-admin", "support-admin", "helpdesk-admin"].includes(role)
  return !roleMatchesSurface(role, "super-admin") && !roleMatchesSurface(role, "admin")
}

export async function login(
  input: { corporateId?: string; email: string; password: string },
  surface: AuthSurface = "tenant",
) {
  const response = await fetch(`${apiBaseUrl}/api/v1/auth/login`, {
    body: JSON.stringify({ ...input, surface }),
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

  if (!roleMatchesSurface(result.selectedTenant.role, surface)) {
    const label = surface === "super-admin" ? "super admin" : surface
    throw new Error(`This account is not allowed to use the ${label} login.`)
  }

  storeSession(result, surface)
  return result
}
