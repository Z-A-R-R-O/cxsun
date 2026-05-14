import { apiBaseUrl } from "src/features/auth/auth-client"

export interface IndustryRecord {
  id: number
  code: string
  name: string
  payload_schema: string
  default_features: string
  default_ui_settings: string
  created_at: string
  updated_at: string
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

export async function upsertIndustry(input: { id?: number; code: string; name: string }) {
  const response = await fetch(`${apiBaseUrl}/api/v1/industries/upsert`, {
    body: JSON.stringify({
      ...input,
      payload_schema: { company: ["gstin", "address"], transaction: ["channel"] },
      default_features: ["company.manage"],
      default_ui_settings: { accent: "emerald" },
    }),
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
