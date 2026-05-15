import { apiBaseUrl } from "src/features/auth/auth-client"

export interface IndustryRecord {
  id: number
  code: string
  name: string
  status: "active" | "not_active" | "suspend"
  payload_schema: string
  default_features: string
  default_ui_settings: string
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface IndustryUpsertInput {
  id?: number
  code: string
  name: string
  status: IndustryRecord["status"]
  payload_schema: Record<string, unknown>
  default_features: string[]
  default_ui_settings: Record<string, unknown>
}

export async function listIndustries() {
  const response = await fetch(`${apiBaseUrl}/api/v1/industries`, {
    cache: "no-store",
    headers: { Accept: "application/json" },
  })

  if (!response.ok) {
    throw new Error(`Industry list failed with status ${response.status}.`)
  }

  return (await response.json()) as IndustryRecord[]
}

export async function upsertIndustry(input: IndustryUpsertInput) {
  const response = await fetch(`${apiBaseUrl}/api/v1/industries/upsert`, {
    body: JSON.stringify(input),
    cache: "no-store",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    method: "POST",
  })

  if (!response.ok) {
    throw new Error(`Industry save failed with status ${response.status}.`)
  }

  const result = (await response.json()) as { ok: boolean; industry?: IndustryRecord; error?: string }

  if (!result.ok || !result.industry) {
    throw new Error(result.error ?? "Industry save failed.")
  }

  return result.industry
}

export async function destroyIndustry(id: number) {
  await mutateIndustry(id, "destroy")
}

export async function restoreIndustry(id: number) {
  await mutateIndustry(id, "restore")
}

async function mutateIndustry(id: number, action: "destroy" | "restore") {
  const response = await fetch(`${apiBaseUrl}/api/v1/industries/${id}/${action}`, {
    body: "{}",
    cache: "no-store",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    method: "POST",
  })

  if (!response.ok) {
    throw new Error(`Industry ${action} failed with status ${response.status}.`)
  }

  const result = (await response.json()) as { ok: boolean; error?: string }

  if (!result.ok) {
    throw new Error(result.error ?? `Industry ${action} failed.`)
  }
}

export function emptyIndustry(): IndustryUpsertInput {
  return {
    code: "",
    name: "",
    status: "active",
    payload_schema: { company: ["gstin", "address"], transaction: ["channel"] },
    default_features: ["company.manage"],
    default_ui_settings: { accent: "emerald" },
  }
}

export function toIndustryInput(industry: IndustryRecord): IndustryUpsertInput {
  return {
    id: industry.id,
    code: industry.code,
    name: industry.name,
    status: industry.status,
    payload_schema: parseJsonObject(industry.payload_schema),
    default_features: parseJsonArray(industry.default_features),
    default_ui_settings: parseJsonObject(industry.default_ui_settings),
  }
}

function parseJsonObject(value: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(value)
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {}
  } catch {
    return {}
  }
}

function parseJsonArray(value: string): string[] {
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed.map(String) : []
  } catch {
    return []
  }
}
