import { apiBaseUrl, authHeaders, type AuthSession } from "src/features/auth/auth-client"
import type { MasterDataKind, MasterDataModuleDefinition, MasterDataRecord, MasterDataUpsertInput } from "../domain/master-data"

export async function listMasterDataModules(session: AuthSession, kind?: MasterDataKind) {
  if (kind === "master") {
    return Promise.all([
      getStandaloneMasterDefinition(session, "contacts"),
      getStandaloneMasterDefinition(session, "products"),
      getStandaloneMasterDefinition(session, "orders"),
    ])
  }

  const params = kind ? `?kind=${encodeURIComponent(kind)}` : ""
  const response = await fetch(`${apiBaseUrl}/api/v1/master-data/modules${params}`, {
    cache: "no-store",
    headers: authHeaders(session),
  })

  if (!response.ok) {
    throw new Error(`Master data modules failed with status ${response.status}.`)
  }

  return (await response.json()) as MasterDataModuleDefinition[]
}

export async function listMasterDataRecords(session: AuthSession, moduleKey: string) {
  const response = await fetch(`${apiBaseUrl}${moduleEndpoint(moduleKey)}`, {
    cache: "no-store",
    headers: authHeaders(session),
  })

  if (!response.ok) {
    throw new Error(`Module record list failed with status ${response.status}.`)
  }

  return (await response.json()) as MasterDataRecord[]
}

export async function upsertMasterDataRecord(session: AuthSession, moduleKey: string, input: MasterDataUpsertInput) {
  const response = await fetch(`${apiBaseUrl}${moduleEndpoint(moduleKey)}/upsert`, {
    body: JSON.stringify(input),
    cache: "no-store",
    headers: {
      ...authHeaders(session),
      "Content-Type": "application/json",
    },
    method: "POST",
  })

  if (!response.ok) {
    throw new Error(`Module record save failed with status ${response.status}.`)
  }

  const result = (await response.json()) as { ok: boolean; record?: MasterDataRecord; error?: string }

  if (!result.ok || !result.record) {
    throw new Error(result.error ?? "Module record save failed.")
  }

  return result.record
}

export async function destroyMasterDataRecord(session: AuthSession, moduleKey: string, idOrUuid: string) {
  await mutateMasterDataRecord(session, moduleKey, idOrUuid, "destroy")
}

export async function restoreMasterDataRecord(session: AuthSession, moduleKey: string, idOrUuid: string) {
  await mutateMasterDataRecord(session, moduleKey, idOrUuid, "restore")
}

async function mutateMasterDataRecord(session: AuthSession, moduleKey: string, idOrUuid: string, action: "destroy" | "restore") {
  const response = await fetch(`${apiBaseUrl}${moduleEndpoint(moduleKey)}/${encodeURIComponent(idOrUuid)}/${action}`, {
    body: "{}",
    cache: "no-store",
    headers: {
      ...authHeaders(session),
      "Content-Type": "application/json",
    },
    method: "POST",
  })

  if (!response.ok) {
    throw new Error(`Module record ${action} failed with status ${response.status}.`)
  }

  const result = (await response.json()) as { ok: boolean; error?: string }

  if (!result.ok) {
    throw new Error(result.error ?? `Module record ${action} failed.`)
  }
}

async function getStandaloneMasterDefinition(session: AuthSession, moduleKey: "contacts" | "products" | "orders") {
  const response = await fetch(`${apiBaseUrl}${moduleEndpoint(moduleKey)}/definition`, {
    cache: "no-store",
    headers: authHeaders(session),
  })

  if (!response.ok) {
    throw new Error(`${moduleKey} definition failed with status ${response.status}.`)
  }

  return (await response.json()) as MasterDataModuleDefinition
}

function moduleEndpoint(moduleKey: string) {
  if (moduleKey === "contacts") return "/api/v1/contacts"
  if (moduleKey === "products") return "/api/v1/products"
  if (moduleKey === "orders") return "/api/v1/orders"
  return `/api/v1/common/${encodeURIComponent(moduleKey)}`
}
