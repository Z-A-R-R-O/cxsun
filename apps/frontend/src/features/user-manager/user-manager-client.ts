import { apiBaseUrl, authHeaders, type AuthSession } from "src/features/auth/auth-client"

export type AdminUserStatus = "active" | "inactive" | "suspend"
export type AdminUserRole = "super-admin" | "software-admin" | "support-admin" | "helpdesk-admin"
export type TenantUserRole = "admin" | "manager" | "staff" | "user" | "software-admin"

export interface AdminUserRecord {
  id: number
  name: string
  email: string
  role: AdminUserRole
  status: AdminUserStatus
  created_at: string
  updated_at: string
}

export interface AdminUserUpsertInput {
  id?: number
  name: string
  email: string
  password?: string
  role: AdminUserRole
  status: AdminUserStatus
}

export interface TenantUserRecord {
  access_id: number
  user_id: number
  tenant_id: number
  tenant_code: number
  tenant_slug: string
  tenant_name: string
  name: string
  email: string
  role: string
  status: AdminUserStatus
  created_at: string
  updated_at: string
  access_created_at: string
}

export interface TenantUserSummary {
  tenant_id: number
  tenant_code: number
  tenant_slug: string
  tenant_name: string
  tenant_status: string
  user_count: number
}

export interface TenantUserUpsertInput {
  access_id?: number
  user_id?: number
  tenant_id: number
  name: string
  email: string
  password?: string
  role: TenantUserRole
  status: AdminUserStatus
}

export async function listAdminUsers(session: AuthSession) {
  const response = await fetch(`${apiBaseUrl}/api/v1/admin-users`, {
    cache: "no-store",
    headers: authHeaders(session),
  })
  if (!response.ok) throw new Error(`Admin users failed with status ${response.status}.`)
  return (await response.json()) as AdminUserRecord[]
}

export async function upsertAdminUser(session: AuthSession, input: AdminUserUpsertInput) {
  const response = await fetch(`${apiBaseUrl}/api/v1/admin-users/upsert`, {
    body: JSON.stringify(input),
    cache: "no-store",
    headers: {
      ...authHeaders(session),
      "Content-Type": "application/json",
    },
    method: "POST",
  })
  if (!response.ok) throw new Error(`Admin user save failed with status ${response.status}.`)
  const result = (await response.json()) as { ok: boolean; user?: AdminUserRecord; error?: string }
  if (!result.ok || !result.user) throw new Error(result.error ?? "Admin user save failed.")
  return result.user
}

export async function listTenantUsers(session: AuthSession, tenantId: number) {
  const response = await fetch(`${apiBaseUrl}/api/v1/users/tenant/${tenantId}`, {
    cache: "no-store",
    headers: authHeaders(session),
  })
  if (!response.ok) throw new Error(`Tenant users failed with status ${response.status}.`)
  return (await response.json()) as TenantUserRecord[]
}

export async function listTenantUserSummaries(session: AuthSession) {
  const response = await fetch(`${apiBaseUrl}/api/v1/users/tenant-summary`, {
    cache: "no-store",
    headers: authHeaders(session),
  })
  if (!response.ok) throw new Error(`Tenant user summary failed with status ${response.status}.`)
  return (await response.json()) as TenantUserSummary[]
}

export async function upsertTenantUser(session: AuthSession, input: TenantUserUpsertInput) {
  const response = await fetch(`${apiBaseUrl}/api/v1/users/upsert`, {
    body: JSON.stringify(input),
    cache: "no-store",
    headers: {
      ...authHeaders(session),
      "Content-Type": "application/json",
    },
    method: "POST",
  })
  if (!response.ok) throw new Error(`Tenant user save failed with status ${response.status}.`)
  const result = (await response.json()) as { ok: boolean; user?: TenantUserRecord; error?: string }
  if (!result.ok || !result.user) throw new Error(result.error ?? "Tenant user save failed.")
  return result.user
}

export function emptyAdminUser(): AdminUserUpsertInput {
  return {
    name: "",
    email: "",
    password: "",
    role: "software-admin",
    status: "active",
  }
}

export function toAdminUserInput(user: AdminUserRecord): AdminUserUpsertInput {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    password: "",
    role: user.role,
    status: user.status,
  }
}

export function emptyTenantUser(tenantId: number): TenantUserUpsertInput {
  return {
    tenant_id: tenantId,
    name: "",
    email: "",
    password: "",
    role: "user",
    status: "active",
  }
}

export function toTenantUserInput(user: TenantUserRecord): TenantUserUpsertInput {
  return {
    access_id: user.access_id,
    user_id: user.user_id,
    tenant_id: user.tenant_id,
    name: user.name,
    email: user.email,
    password: "",
    role: user.role as TenantUserRole,
    status: user.status,
  }
}
