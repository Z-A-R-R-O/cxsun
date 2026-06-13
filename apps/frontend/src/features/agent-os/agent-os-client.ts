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
  capabilities: ZetroCapability[]
  agents: ZetroAgentStatus[]
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

export interface ZetroCapability {
  key: string
  label: string
  value: string
  state: "active" | "setup" | "blocked" | "planned"
  detail: string
}

export interface ZetroAgentStatus {
  key: string
  name: string
  role: string
  status: "active" | "blocked" | "planned"
  stage: string
  model_policy: string
  next_action: string
}

export interface ZetroReadSource {
  id: string
  label: string
  path: string
  purpose: string
  category: string
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
  agents: ZetroAgentStatus[]
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
  category: string
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

export interface ZetroConversationSummary {
  uuid: string
  title: string
  status: string
  model: string | null
  provider: string | null
  message_count: number
  created_at: string
  updated_at: string
}

export interface ZetroConversationMessage {
  id: string
  role: "assistant" | "user"
  body: string
  model?: string
  created_at: string
}

export interface ZetroConversationDetail {
  ok: boolean
  error?: string
  conversation?: Omit<ZetroConversationSummary, "message_count">
  messages?: ZetroConversationMessage[]
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
  warning?: string
  needs_save?: boolean
  connection: ZetroApiConnection
}

export interface ZetroApiConnectionSaveResponse extends ZetroApiConnectionResponse {
  saved: boolean
  test?: ZetroApiConnectionTestResponse | null
  error?: string
}

export interface ZetroLearnResponse {
  ok: boolean
  learned: number
  source_count: number
  query: string | null
}

export async function getAgentOsStatus(session: AuthSession) {
  const response = await fetch(`${apiBaseUrl}/api/v1/agent-os/status`, {
    cache: "no-store",
    headers: { ...authHeaders(session), ...zetroAudienceHeaders(session) },
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
    headers: { ...authHeaders(session), ...zetroAudienceHeaders(session) },
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
    headers: { ...authHeaders(session), ...zetroAudienceHeaders(session), "Content-Type": "application/json" },
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
    body: JSON.stringify({ ...input, audience: zetroAudience(session), userRole: session.selectedTenant.role }),
    cache: "no-store",
    headers: { ...authHeaders(session), ...zetroAudienceHeaders(session), "Content-Type": "application/json" },
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
  input: { message: string; model: string; providerKey?: string; conversationUuid?: string | null },
) {
  const response = await fetch(`${apiBaseUrl}/api/v1/agent-os/chat`, {
    body: JSON.stringify({
      conversationUuid: input.conversationUuid,
      message: input.message,
      model: input.model,
      providerKey: input.providerKey,
      audience: zetroAudience(session),
      userRole: session.selectedTenant.role,
    }),
    cache: "no-store",
    headers: { ...authHeaders(session), ...zetroAudienceHeaders(session), "Content-Type": "application/json" },
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

export async function listZetroConversations(session: AuthSession) {
  const response = await fetch(`${apiBaseUrl}/api/v1/agent-os/conversations?limit=20`, {
    cache: "no-store",
    headers: authHeaders(session),
  })

  if (!response.ok) {
    throw new Error(`ZETRO chat history failed with status ${response.status}.`)
  }

  return (await response.json()) as { ok: boolean; conversations: ZetroConversationSummary[] }
}

export async function getZetroConversation(session: AuthSession, uuid: string) {
  const response = await fetch(`${apiBaseUrl}/api/v1/agent-os/conversations/${encodeURIComponent(uuid)}`, {
    cache: "no-store",
    headers: authHeaders(session),
  })

  if (!response.ok) {
    throw new Error(`ZETRO chat load failed with status ${response.status}.`)
  }

  const payload = (await response.json()) as ZetroConversationDetail
  if (!payload.ok) {
    throw new Error(payload.error ?? "ZETRO chat load failed.")
  }
  return payload
}

export async function clearZetroConversation(session: AuthSession, uuid: string) {
  const response = await fetch(`${apiBaseUrl}/api/v1/agent-os/conversations/${encodeURIComponent(uuid)}`, {
    cache: "no-store",
    headers: authHeaders(session),
    method: "DELETE",
  })

  if (!response.ok) {
    throw new Error(`ZETRO clear chat failed with status ${response.status}.`)
  }

  return (await response.json()) as { ok: boolean; cleared: number }
}

export async function clearZetroConversations(session: AuthSession) {
  const response = await fetch(`${apiBaseUrl}/api/v1/agent-os/conversations`, {
    cache: "no-store",
    headers: authHeaders(session),
    method: "DELETE",
  })

  if (!response.ok) {
    throw new Error(`ZETRO clear history failed with status ${response.status}.`)
  }

  return (await response.json()) as { ok: boolean; cleared: number }
}

export async function learnZetroDocs(session: AuthSession, query?: string) {
  const response = await fetch(`${apiBaseUrl}/api/v1/agent-os/learn`, {
    body: JSON.stringify({ audience: zetroAudience(session), query: query?.trim() || undefined, userRole: session.selectedTenant.role }),
    cache: "no-store",
    headers: { ...authHeaders(session), ...zetroAudienceHeaders(session), "Content-Type": "application/json" },
    method: "POST",
  })

  if (!response.ok) {
    throw new Error(`ZETRO learn failed with status ${response.status}.`)
  }

  return (await response.json()) as ZetroLearnResponse
}

export function zetroAudience(session: AuthSession) {
  return isZetroAdminRole(session.selectedTenant.role) ? "admin" : "user"
}

export function isZetroAdminRole(role: string) {
  return role === "super-admin"
}

function zetroAudienceHeaders(session: AuthSession) {
  return {
    "x-user-role": session.selectedTenant.role,
    "x-zetro-audience": zetroAudience(session),
  }
}
