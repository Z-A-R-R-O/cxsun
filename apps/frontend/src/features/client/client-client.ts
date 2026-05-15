import { apiBaseUrl } from "src/features/auth/auth-client"

export type ClientStatus = "active" | "inactive" | "suspend"

export interface ClientRecord {
  id: number
  name: string
  company_name: string | null
  category: string | null
  source: string | null
  phone: string | null
  email: string | null
  location: string | null
  notes: string
  status: ClientStatus
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export type ClientUpsertInput = Omit<ClientRecord, "id" | "created_at" | "updated_at" | "deleted_at"> & { id?: number }

export async function listClients() {
  const response = await fetch(`${apiBaseUrl}/api/v1/clients`, {
    cache: "no-store",
    headers: { Accept: "application/json" },
  })

  if (!response.ok) throw new Error(`Client list failed with status ${response.status}.`)
  return (await response.json()) as ClientRecord[]
}

export async function upsertClient(input: ClientUpsertInput) {
  const response = await fetch(`${apiBaseUrl}/api/v1/clients/upsert`, {
    body: JSON.stringify(input),
    cache: "no-store",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    method: "POST",
  })
  if (!response.ok) throw new Error(`Client save failed with status ${response.status}.`)
  const result = (await response.json()) as { ok: boolean; client?: ClientRecord; error?: string }
  if (!result.ok || !result.client) throw new Error(result.error ?? "Client save failed.")
  return result.client
}

export async function destroyClient(id: number) {
  await mutateClient(id, "destroy")
}

export async function restoreClient(id: number) {
  await mutateClient(id, "restore")
}

async function mutateClient(id: number, action: "destroy" | "restore") {
  const response = await fetch(`${apiBaseUrl}/api/v1/clients/${id}/${action}`, {
    body: "{}",
    cache: "no-store",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    method: "POST",
  })
  if (!response.ok) throw new Error(`Client ${action} failed with status ${response.status}.`)
  const result = (await response.json()) as { ok: boolean; error?: string }
  if (!result.ok) throw new Error(result.error ?? `Client ${action} failed.`)
}

export function emptyClient(): ClientUpsertInput {
  return {
    name: "",
    company_name: null,
    category: "scratch",
    source: "memory",
    phone: null,
    email: null,
    location: null,
    notes: "",
    status: "active",
  }
}

export function toClientInput(client: ClientRecord): ClientUpsertInput {
  return {
    id: client.id,
    name: client.name,
    company_name: client.company_name,
    category: client.category,
    source: client.source,
    phone: client.phone,
    email: client.email,
    location: client.location,
    notes: client.notes,
    status: client.status,
  }
}
