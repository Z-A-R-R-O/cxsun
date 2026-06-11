import { apiBaseUrl, authHeaders, type AuthSession } from "src/features/auth/auth-client"

export interface AgentOsStatus {
  ok: boolean
  name: string
  phase: string
  mode: string
  automation_enabled: boolean
  router_enabled: boolean
  helper_enabled: boolean
  api_connected: boolean
  provider: string
  default_model: ZetroModel
  models: ZetroModel[]
  api_connection: ZetroApiConnection
  provider_connections: ZetroProviderConnection[]
  tables: {
    conversations: number
    agent_logs: number
    knowledge_documents: number
  }
  next: string[]
  recommended_updates: ZetroRecommendedUpdate[]
}

export interface ZetroApiConnection {
  provider: string
  provider_name: string
  provider_kind: string
  connected: boolean
  configured_by: string | null
  base_url: string
  app_title: string
  default_model: string
  free_models: string
  premium_models: string
  free_model_count: number
  premium_model_count: number
  required_env: string[]
  is_active: boolean
  status: string
  last_test_status: string | null
  last_test_message: string | null
  last_tested_at: string | null
}

export interface ZetroProviderConnection extends ZetroApiConnection {}

export interface ZetroRecommendedUpdate {
  title: string
  detail: string
  priority: "high" | "medium" | "low"
}

export interface ZetroReadSource {
  id: string
  label: string
  path: string
  purpose: string
  title: string
  summary: string
  chunks: number
}

export interface ZetroReadResponse {
  ok: boolean
  name: string
  mode: string
  title: string
  summary: string
  api_connected: boolean
  default_model: ZetroModel
  models: ZetroModel[]
  api_connection: ZetroApiConnection
  provider_connections: ZetroProviderConnection[]
  sources: ZetroReadSource[]
  search_examples: string[]
  limits: string[]
  recommended_updates: ZetroRecommendedUpdate[]
}

export interface ZetroSearchResult {
  id: string
  label: string
  path: string
  purpose: string
  title: string
  chunk_key: string
  heading: string
  excerpt: string
  score: number
}

export interface ZetroSearchResponse {
  ok: boolean
  query: string
  results: ZetroSearchResult[]
}

export interface ZetroModel {
  id: string
  label: string
  provider: string
  tier: "free" | "premium"
  requiresKey: boolean
}

export interface ZetroChatResponse {
  ok: boolean
  conversation_uuid?: string
  model?: ZetroModel
  message?: string
  error?: string
}

export interface ZetroApiConnectionResponse {
  ok: boolean
  connection: ZetroApiConnection
  connections: ZetroProviderConnection[]
  models: ZetroModel[]
  recommended_updates: ZetroRecommendedUpdate[]
}

export interface ZetroApiConnectionTestResponse {
  ok: boolean
  connected: boolean
  model?: ZetroModel
  message?: string
  model_count?: number
  error?: string
  connection: ZetroApiConnection
}

export interface ZetroApiConnectionSaveResponse extends ZetroApiConnectionResponse {
  saved: boolean
  test?: ZetroApiConnectionTestResponse | null
  error?: string
}

export async function getAgentOsStatus(session: AuthSession) {
  const response = await fetch(`${apiBaseUrl}/api/v1/agent-os/status`, {
    cache: "no-store",
    headers: authHeaders(session),
  })

  if (!response.ok) {
    throw new Error(`Agent OS status failed with status ${response.status}.`)
  }

  return (await response.json()) as AgentOsStatus
}

export async function getZetroRead() {
  const response = await fetch(`${apiBaseUrl}/api/v1/agent-os/read`, {
    cache: "no-store",
  })

  if (!response.ok) {
    throw new Error(`ZETRO read screen failed with status ${response.status}.`)
  }

  return (await response.json()) as ZetroReadResponse
}

export async function searchZetroGuide(query: string) {
  const params = new URLSearchParams()
  if (query.trim()) {
    params.set("query", query.trim())
  }
  params.set("limit", "8")

  const response = await fetch(`${apiBaseUrl}/api/v1/agent-os/search?${params.toString()}`, {
    cache: "no-store",
  })

  if (!response.ok) {
    throw new Error(`ZETRO guide search failed with status ${response.status}.`)
  }

  return (await response.json()) as ZetroSearchResponse
}

export async function getZetroApiConnection(session: AuthSession) {
  const response = await fetch(`${apiBaseUrl}/api/v1/agent-os/api-connection`, {
    cache: "no-store",
    headers: authHeaders(session),
  })

  if (!response.ok) {
    throw new Error(`ZETRO API connection failed with status ${response.status}.`)
  }

  return (await response.json()) as ZetroApiConnectionResponse
}

export async function testZetroApiConnection(
  session: AuthSession,
  input: { apiKey?: string; providerKey?: string; model?: string },
) {
  const response = await fetch(`${apiBaseUrl}/api/v1/agent-os/api-connection/test`, {
    body: JSON.stringify(input),
    cache: "no-store",
    headers: { ...authHeaders(session), "Content-Type": "application/json" },
    method: "POST",
  })

  if (!response.ok) {
    throw new Error(`ZETRO API test failed with status ${response.status}.`)
  }

  return (await response.json()) as ZetroApiConnectionTestResponse
}

export async function saveZetroApiConnection(
  session: AuthSession,
  input: {
    apiKey?: string
    providerKey: string
    providerName?: string
    providerKind?: string
    baseUrl?: string
    defaultModel?: string
    freeModels?: string
    premiumModels?: string
    isActive?: boolean
    testAfterSave?: boolean
  },
) {
  const response = await fetch(`${apiBaseUrl}/api/v1/agent-os/api-connection/save`, {
    body: JSON.stringify(input),
    cache: "no-store",
    headers: { ...authHeaders(session), "Content-Type": "application/json" },
    method: "POST",
  })

  if (!response.ok) {
    throw new Error(`ZETRO API save failed with status ${response.status}.`)
  }

  const payload = (await response.json()) as ZetroApiConnectionSaveResponse
  if (!payload.ok) {
    throw new Error(payload.error ?? "ZETRO API save failed.")
  }

  return payload
}

export async function sendZetroChat(
  session: AuthSession,
  input: { message: string; model: string; conversationUuid?: string | null },
) {
  const response = await fetch(`${apiBaseUrl}/api/v1/agent-os/chat`, {
    body: JSON.stringify({
      conversationUuid: input.conversationUuid,
      message: input.message,
      model: input.model,
    }),
    cache: "no-store",
    headers: { ...authHeaders(session), "Content-Type": "application/json" },
    method: "POST",
  })

  if (!response.ok) {
    throw new Error(`ZETRO chat failed with status ${response.status}.`)
  }

  const payload = (await response.json()) as ZetroChatResponse
  if (!payload.ok) {
    throw new Error(payload.error ?? "ZETRO chat failed.")
  }

  return payload
}
