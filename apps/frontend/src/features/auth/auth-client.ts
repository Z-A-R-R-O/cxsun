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

export type AuthSurface = "tenant" | "admin" | "super-admin"

const configuredApiBaseUrl =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:6001"
export const apiBaseUrl = configuredApiBaseUrl.replace(/\/api(\/v\d+)?\/?$/, "").replace(/\/$/, "")

function sessionKey(surface: AuthSurface = "tenant") {
  return `cxsun.auth.${surface}.session`
}

export function getStoredSession(surface: AuthSurface = "tenant"): AuthSession | null {
  try {
    const value = localStorage.getItem(sessionKey(surface))
    return value ? (JSON.parse(value) as AuthSession) : null
  } catch {
    return null
  }
}

export function storeSession(session: AuthSession, surface: AuthSurface = "tenant") {
  localStorage.setItem(sessionKey(surface), JSON.stringify(session))
}

export function clearSession(surface: AuthSurface = "tenant") {
  localStorage.removeItem(sessionKey(surface))
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
  input: { email: string; password: string },
  surface: AuthSurface = "tenant",
) {
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

  if (!roleMatchesSurface(result.selectedTenant.role, surface)) {
    const label = surface === "super-admin" ? "super admin" : surface
    throw new Error(`This account is not allowed to use the ${label} login.`)
  }

  storeSession(result, surface)
  return result
}
