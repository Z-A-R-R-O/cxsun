import { apiBaseUrl } from "src/features/auth/auth-client"

export type PlatformUserStatus = "active" | "inactive" | "suspend"

export interface TenantUserSummary {
  tenant_id: number
  tenant_code: number
  tenant_slug: string
  tenant_name: string
  tenant_status: string
  user_count: number
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
  status: PlatformUserStatus
  created_at: string
  updated_at: string
  access_created_at: string
}

export interface PlatformUserUpsertInput {
  access_id?: number
  user_id?: number
  tenant_id: number
  name: string
  email: string
  password?: string
  role: string
  status: PlatformUserStatus
}

export async function listUserTenantSummaries() {
  const response = await fetch(`${apiBaseUrl}/api/v1/users/tenant-summary`, {
    cache: "no-store",
    headers: { Accept: "application/json" },
  })
  if (!response.ok) throw new Error(`User tenant summary failed with status ${response.status}.`)
  return (await response.json()) as TenantUserSummary[]
}

export async function listTenantUsers(tenantId: number) {
  const response = await fetch(`${apiBaseUrl}/api/v1/users/tenant/${tenantId}`, {
    cache: "no-store",
    headers: { Accept: "application/json" },
  })
  if (!response.ok) throw new Error(`Tenant users failed with status ${response.status}.`)
  return (await response.json()) as TenantUserRecord[]
}

export async function upsertPlatformUser(input: PlatformUserUpsertInput) {
  const response = await fetch(`${apiBaseUrl}/api/v1/users/upsert`, {
    body: JSON.stringify(input),
    cache: "no-store",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    method: "POST",
  })
  if (!response.ok) throw new Error(`User save failed with status ${response.status}.`)
  const result = (await response.json()) as { ok: boolean; user?: TenantUserRecord; error?: string }
  if (!result.ok || !result.user) throw new Error(result.error ?? "User save failed.")
  return result.user
}

export function emptyPlatformUser(tenantId: number): PlatformUserUpsertInput {
  return {
    tenant_id: tenantId,
    name: "",
    email: "",
    password: "",
    role: "user",
    status: "active",
  }
}

export function toPlatformUserInput(user: TenantUserRecord): PlatformUserUpsertInput {
  return {
    access_id: user.access_id,
    user_id: user.user_id,
    tenant_id: user.tenant_id,
    name: user.name,
    email: user.email,
    password: "",
    role: user.role,
    status: user.status,
  }
}
