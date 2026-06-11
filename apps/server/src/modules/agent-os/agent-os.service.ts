import { Injectable } from '../../core/decorators/injectable.js'
import { getDatabase } from '../../infrastructure/database/connection.js'
import { settings } from '../../framework/config/index.js'
import { dispatchPublicUuid } from '../../shared/helpers/public-uuid.js'
import { sql } from 'kysely'
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto'
import {
  readZetroMarkdownDocuments,
  searchZetroMarkdownDocuments,
} from './zetro-markdown-sources.js'

export interface ZetroChatInput {
  message?: string
  model?: string
  conversationUuid?: string | null
}

export interface ZetroSearchInput {
  query?: string
  limit?: number | string
}

export interface ZetroApiConnectionInput {
  apiKey?: string
  providerKey?: string
  providerName?: string
  providerKind?: string
  baseUrl?: string
  defaultModel?: string
  freeModels?: string
  premiumModels?: string
  isActive?: boolean
  model?: string
  testAfterSave?: boolean
}

@Injectable()
export class AgentOsService {
  async status() {
    const database = getDatabase()
    const providerState = await zetroProviderState()
    const [conversationCount, logCount, knowledgeCount] = await Promise.all([
      countTable(database, 'conversations'),
      countTable(database, 'agent_logs'),
      countTable(database, 'knowledge_documents'),
    ])

    return {
      ok: true,
      name: 'ZETRO',
      phase: 'P1 Site Helper Agent',
      mode: 'base',
      automation_enabled: false,
      router_enabled: false,
      helper_enabled: false,
      api_connected: providerState.connection.connected,
      provider: providerState.connection.provider,
      default_model: providerState.defaultModel,
      models: providerState.models,
      api_connection: providerState.connection,
      provider_connections: providerState.connections,
      tables: {
        conversations: conversationCount,
        agent_logs: logCount,
        knowledge_documents: knowledgeCount,
      },
      next: [
        'Ingest ZRO, assist, site, and feature docs',
        'Ground Helper Agent answers with RAG search',
        'Add Operator tools after read-only helper is stable',
      ],
      recommended_updates: recommendedUpdates(providerState.connection.connected),
    }
  }

  async read() {
    const documents = readZetroMarkdownDocuments()
    const providerState = await zetroProviderState()
    return {
      ok: true,
      name: 'ZETRO',
      mode: 'read-only',
      title: 'ZETRO Read Screen',
      summary: 'A public, read-only guide sourced from existing ZRO and assist markdown. Full chat and actions stay inside authenticated product surfaces.',
      api_connected: providerState.connection.connected,
      default_model: providerState.defaultModel,
      models: providerState.models,
      api_connection: providerState.connection,
      provider_connections: providerState.connections,
      sources: documents.map((document) => ({
        id: document.id,
        label: document.label,
        path: document.path,
        purpose: document.purpose,
        title: document.title,
        summary: document.summary,
        chunks: document.chunks.length,
      })),
      search_examples: [
        'What is ZETRO?',
        'How does tenant admin super-admin split work?',
        'Where are tasks and billing?',
        'How will Operator and Workflow agents work later?',
      ],
      limits: [
        'This public screen does not show private tenant records.',
        'Tool calls and automation are disabled here.',
        'Live assistant chat belongs inside the dashboard after login.',
      ],
      recommended_updates: recommendedUpdates(providerState.connection.connected),
    }
  }

  async apiConnection() {
    const providerState = await zetroProviderState()
    return {
      ok: true,
      connection: providerState.connection,
      connections: providerState.connections,
      models: providerState.models,
      recommended_updates: recommendedUpdates(providerState.connection.connected),
    }
  }

  async testApiConnection(input: ZetroApiConnectionInput) {
    const providerConfig = await resolveProviderForInput(input)
    const apiKey = input.apiKey?.trim() || providerConfig.apiKey
    const model = normalizeModel(input.model, providerConfig.models, providerConfig.defaultModel)
    const startedAt = Date.now()

    if (!apiKey) {
      return {
        ok: false,
        connected: false,
        error: `${providerConfig.requiredKeyName} is not configured. Paste a key to test it, then save it in ZETRO provider settings.`,
        connection: (await zetroProviderState()).connection,
      }
    }

    try {
      const result = await testProviderConnection({ ...providerConfig, apiKey, defaultModel: model.id })
      await writeAgentLog({
        conversationId: null,
        eventType: 'provider.test',
        message: `test ${providerConfig.providerKey} connection`,
        model,
        reply: result.message,
        latencyMs: Date.now() - startedAt,
        status: 'ok',
        metadata: {
          provider: providerConfig.providerKey,
          modelTier: model.tier,
          usedConfiguredKey: apiKey === providerConfig.apiKey,
          modelCount: result.modelCount,
        },
      })

      if (providerConfig.savedRowId) {
        await updateProviderTestState(providerConfig.providerKey, 'ok', result.message)
      }

      return {
        ok: true,
        connected: true,
        model,
        message: result.message,
        model_count: result.modelCount,
        connection: (await zetroProviderState()).connection,
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'OpenRouter connection test failed.'
      if (providerConfig.savedRowId) {
        await updateProviderTestState(providerConfig.providerKey, 'failed', errorMessage)
      }
      await writeAgentLog({
        conversationId: null,
        eventType: 'provider.test',
        message: `test ${providerConfig.providerKey} connection`,
        model,
        reply: '',
        latencyMs: Date.now() - startedAt,
        status: 'failed',
        errorMessage,
        metadata: {
          provider: providerConfig.providerKey,
          modelTier: model.tier,
          usedConfiguredKey: apiKey === providerConfig.apiKey,
        },
      })

      return {
        ok: false,
        connected: false,
        model,
        error: errorMessage,
        connection: (await zetroProviderState()).connection,
      }
    }
  }

  async saveApiConnection(input: ZetroApiConnectionInput) {
    const providerKey = normalizeProviderKey(input.providerKey)
    const defaults = providerDefaults(providerKey)
    const database = getDatabase()
    const existing = await database
      .selectFrom('agent_provider_connections')
      .selectAll()
      .where('provider_key', '=', providerKey)
      .executeTakeFirst()
    const apiKey = input.apiKey?.trim()

    if (!existing && !apiKey) {
      return { ok: false, error: 'API key is required for a new provider connection.' }
    }

    const encrypted = apiKey ? encryptSecret(apiKey) : {
      ciphertext: existing?.api_key_ciphertext ?? '',
      iv: existing?.api_key_iv ?? '',
      tag: existing?.api_key_tag ?? '',
    }
    const values = {
      provider_name: input.providerName?.trim() || defaults.providerName,
      provider_kind: normalizeProviderKind(input.providerKind, defaults.providerKind),
      base_url: (input.baseUrl?.trim() || defaults.baseUrl).replace(/\/$/, ''),
      api_key_ciphertext: encrypted.ciphertext,
      api_key_iv: encrypted.iv,
      api_key_tag: encrypted.tag,
      default_model: input.defaultModel?.trim() || existing?.default_model || defaults.defaultModel,
      free_models: optionalTrim(input.freeModels) ?? existing?.free_models ?? defaults.freeModels,
      premium_models: optionalTrim(input.premiumModels) ?? existing?.premium_models ?? defaults.premiumModels,
      is_active: input.isActive === false ? 0 : 1,
      status: 'configured',
      metadata: JSON.stringify({ savedFrom: 'zetro-panel' }),
    }

    if (values.is_active) {
      await database.updateTable('agent_provider_connections').set({ is_active: 0 }).execute()
    }

    if (existing) {
      await database
        .updateTable('agent_provider_connections')
        .set({ ...values, updated_at: sql`CURRENT_TIMESTAMP` })
        .where('provider_key', '=', providerKey)
        .execute()
    } else {
      await database
        .insertInto('agent_provider_connections')
        .values({
          uuid: dispatchPublicUuid(),
          provider_key: providerKey,
          ...values,
        })
        .execute()
    }

    const savedConfig = await resolveProviderForInput({ providerKey, model: values.default_model })
    let testResult: Awaited<ReturnType<typeof this.testApiConnection>> | null = null
    if (input.testAfterSave !== false) {
      testResult = await this.testApiConnection({ providerKey, model: savedConfig.defaultModel })
    }

    const connectionState = await this.apiConnection()
    return {
      ok: true,
      saved: true,
      test: testResult,
      connection: connectionState.connection,
      connections: connectionState.connections,
      models: connectionState.models,
      recommended_updates: connectionState.recommended_updates,
    }
  }

  async search(input: ZetroSearchInput) {
    const query = input.query?.trim() ?? ''
    return {
      ok: true,
      query,
      results: searchZetroMarkdownDocuments(query, parseLimit(input.limit)),
    }
  }

  async learn(input: ZetroSearchInput) {
    const query = input.query?.trim() ?? ''
    const documents = readZetroMarkdownDocuments()
    const chunkFilter = query ? new Set(searchZetroMarkdownDocuments(query, parseLimit(input.limit)).map((result) => result.chunk_key)) : null
    const chunks = documents.flatMap((document) =>
      document.chunks
        .filter((chunk) => !chunkFilter || chunkFilter.has(chunk.chunkKey))
        .map((chunk) => ({ document, chunk })),
    )
    const database = getDatabase()

    for (const { document, chunk } of chunks) {
      await database
        .insertInto('knowledge_documents')
        .values({
          uuid: dispatchPublicUuid(),
          source_type: 'project-markdown',
          source_path: document.path,
          title: `${document.title} - ${chunk.heading}`.slice(0, 255),
          chunk_key: chunk.chunkKey,
          content: chunk.content,
          metadata: JSON.stringify({
            sourceId: document.id,
            label: document.label,
            purpose: document.purpose,
            adaptive: true,
            query: query || null,
          }),
          status: 'active',
        })
        .onDuplicateKeyUpdate({
          source_path: document.path,
          title: `${document.title} - ${chunk.heading}`.slice(0, 255),
          content: chunk.content,
          metadata: JSON.stringify({
            sourceId: document.id,
            label: document.label,
            purpose: document.purpose,
            adaptive: true,
            query: query || null,
          }),
          status: 'active',
          updated_at: sql`CURRENT_TIMESTAMP`,
        })
        .execute()
    }

    await writeAgentLog({
      conversationId: null,
      eventType: 'knowledge.learn',
      message: query || 'learn all existing markdown sources',
      model: defaultModel(),
      reply: `Indexed ${chunks.length} markdown chunks from ${documents.length} existing sources.`,
      latencyMs: 0,
      status: 'ok',
      metadata: {
        source: 'existing-markdown',
        query: query || null,
        chunkCount: chunks.length,
        documentCount: documents.length,
      },
    })

    return {
      ok: true,
      learned: chunks.length,
      source_count: documents.length,
      query: query || null,
    }
  }

  async chat(input: ZetroChatInput) {
    const message = input.message?.trim() ?? ''
    if (!message) {
      return { ok: false, error: 'Message is required.' }
    }

    const providerConfig = await resolveProviderForInput({ model: input.model })
    const model = normalizeModel(input.model, providerConfig.models, providerConfig.defaultModel)
    const database = getDatabase()
    const conversationUuid = input.conversationUuid?.trim() || dispatchPublicUuid()
    const title = message.slice(0, 80) || 'ZETRO conversation'
    const existingConversation = input.conversationUuid
      ? await database.selectFrom('conversations').select(['id', 'uuid']).where('uuid', '=', input.conversationUuid).executeTakeFirst()
      : null

    const conversationId = existingConversation?.id ?? await createConversation(database, conversationUuid, title, model)
    const startedAt = Date.now()
    const localContext = searchZetroMarkdownDocuments(message, 4)

    if (!providerConfig.apiKey) {
      const sourceHint = localContext[0] ? ` I found a matching guide source: ${localContext[0].path} (${localContext[0].heading}).` : ''
      const reply = [
        `ZETRO selected ${model.label}, but provider calls need a saved ${providerConfig.providerName} API key first.`,
        'Open the API panel, save a provider key, then test it once. After that chat will use the saved active provider.',
        sourceHint,
      ].join(' ')

      await writeAgentLog({
        conversationId: Number(conversationId),
        eventType: 'chat.missing_api_key',
        message,
        model,
        reply,
        latencyMs: Date.now() - startedAt,
        status: 'blocked',
        metadata: { provider: providerConfig.providerKey, source: 'universal-chat', apiConnected: false, localContext },
      })

      return {
        ok: true,
        conversation_uuid: conversationUuid,
        model,
        message: reply,
      }
    }

    try {
      const completion = await callProviderChat(providerConfig, model, message, localContext)
      await writeAgentLog({
        conversationId: Number(conversationId),
        eventType: 'chat.openrouter',
        message,
        model,
        reply: completion.content,
        latencyMs: Date.now() - startedAt,
        status: 'ok',
        metadata: {
          provider: settings.zetro.provider,
          providerKey: providerConfig.providerKey,
          source: 'universal-chat',
          apiConnected: true,
          modelTier: model.tier,
          rawModel: completion.model,
          usage: completion.usage,
          localContext,
        },
      })

      return {
        ok: true,
        conversation_uuid: conversationUuid,
        model,
        message: completion.content,
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'OpenRouter request failed.'
      await writeAgentLog({
        conversationId: Number(conversationId),
        eventType: 'chat.openrouter',
        message,
        model,
        reply: '',
        latencyMs: Date.now() - startedAt,
        status: 'failed',
        errorMessage,
        metadata: {
          provider: settings.zetro.provider,
          source: 'universal-chat',
          apiConnected: true,
          modelTier: model.tier,
        },
      })

      return {
        ok: false,
        conversation_uuid: conversationUuid,
        model,
        error: errorMessage,
      }
    }
  }
}

function parseLimit(value: number | string | undefined) {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? Math.min(parsed, 20) : 8
}

async function countTable(database: ReturnType<typeof getDatabase>, table: 'conversations' | 'agent_logs' | 'knowledge_documents') {
  const row = await database
    .selectFrom(table)
    .select((eb) => eb.fn.count<number>('id').as('count'))
    .executeTakeFirst()

  return Number(row?.count ?? 0)
}

async function createConversation(
  database: ReturnType<typeof getDatabase>,
  uuid: string,
  title: string,
  model: ZetroModel,
) {
  await database.insertInto('conversations').values({
    uuid,
    tenant_id: null,
    user_email: null,
    surface: 'tenant',
    title,
    status: 'open',
    metadata: JSON.stringify({ selectedModel: model.id, provider: settings.zetro.provider }),
  }).execute()

  const created = await database.selectFrom('conversations').select('id').where('uuid', '=', uuid).executeTakeFirstOrThrow()
  return created.id
}

export interface ZetroModel {
  id: string
  label: string
  provider: string
  tier: 'free' | 'premium'
  requiresKey: boolean
}

type ZetroProviderKey = 'openrouter' | 'openai' | 'gemini' | 'custom'
type ZetroProviderKind = 'openai-compatible' | 'gemini'

interface ProviderRuntimeConfig {
  providerKey: ZetroProviderKey
  providerName: string
  providerKind: ZetroProviderKind
  baseUrl: string
  apiKey: string | undefined
  requiredKeyName: string
  defaultModel: string
  freeModels: string
  premiumModels: string
  models: ZetroModel[]
  savedRowId?: number
}

interface ProviderConnectionRow {
  id: number
  provider_key: string
  provider_name: string
  provider_kind: string
  base_url: string
  api_key_ciphertext: string
  api_key_iv: string
  api_key_tag: string
  default_model: string
  free_models: string | null
  premium_models: string | null
  is_active: number
  status: string
  last_test_status: string | null
  last_test_message: string | null
  last_tested_at: string | null
}

function zetroModels(providerKey: string = settings.zetro.provider, freeModels = settings.zetro.freeModels, premiumModels = settings.zetro.premiumModels, defaultModelId = settings.zetro.defaultModel): ZetroModel[] {
  const freeIds = freeModels
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
  const premiumIds = premiumModels
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
  const entries = [
    ...freeIds.map((id) => ({ id, tier: 'free' as const })),
    ...premiumIds.map((id) => ({ id, tier: 'premium' as const })),
  ]
  const uniqueEntries = Array.from(new Map(entries.map((entry) => [entry.id, entry])).values())
  const normalized = uniqueEntries.length ? uniqueEntries : [{ id: defaultModelId, tier: 'free' as const }]
  return normalized.map(({ id, tier }) => ({
    id,
    label: modelLabel(id),
    provider: providerKey,
    tier,
    requiresKey: true,
  }))
}

function defaultModel(models = zetroModels(), defaultModelId = settings.zetro.defaultModel): ZetroModel {
  return models.find((model) => model.id === defaultModelId)
    ?? models[0]
    ?? {
      id: defaultModelId,
      label: modelLabel(defaultModelId),
      provider: settings.zetro.provider,
      tier: 'free',
      requiresKey: true,
    }
}

function normalizeModel(modelId?: string, models = zetroModels(), defaultModelId = settings.zetro.defaultModel): ZetroModel {
  return models.find((model) => model.id === modelId) ?? defaultModel(models, defaultModelId)
}

async function zetroProviderState() {
  const savedRows = await listProviderRows()
  const connections = providerCatalog().map((defaults) => {
    const row = savedRows.find((item) => item.provider_key === defaults.providerKey)
    const freeModels = row?.free_models ?? defaults.freeModels
    const premiumModels = row?.premium_models ?? defaults.premiumModels
    const models = zetroModels(defaults.providerKey, freeModels, premiumModels, row?.default_model ?? defaults.defaultModel)
    const envConnected = defaults.providerKey === 'openrouter' && Boolean(settings.zetro.openRouterApiKey)
    const connected = Boolean(row) || envConnected
    return {
      provider: defaults.providerKey,
      provider_name: row?.provider_name ?? defaults.providerName,
      provider_kind: row?.provider_kind ?? defaults.providerKind,
      connected,
      configured_by: row ? 'database' : envConnected ? 'OPENROUTER_API_KEY' : null,
      base_url: row?.base_url ?? defaults.baseUrl,
      app_title: settings.zetro.appTitle,
      default_model: row?.default_model ?? defaults.defaultModel,
      free_models: freeModels,
      premium_models: premiumModels,
      free_model_count: models.filter((model) => model.tier === 'free').length,
      premium_model_count: models.filter((model) => model.tier === 'premium').length,
      required_env: defaults.requiredEnv,
      is_active: Boolean(row?.is_active) || (!savedRows.some((item) => item.is_active) && envConnected && defaults.providerKey === 'openrouter'),
      status: row?.status ?? (envConnected ? 'env' : 'not_configured'),
      last_test_status: row?.last_test_status ?? null,
      last_test_message: row?.last_test_message ?? null,
      last_tested_at: row?.last_tested_at ?? null,
    }
  })
  const activeConnection = connections.find((connection) => connection.is_active && connection.connected)
    ?? connections.find((connection) => connection.connected)
    ?? connections[0]
  const models = zetroModels(
    activeConnection.provider,
    savedRows.find((row) => row.provider_key === activeConnection.provider)?.free_models ?? providerDefaults(activeConnection.provider).freeModels,
    savedRows.find((row) => row.provider_key === activeConnection.provider)?.premium_models ?? providerDefaults(activeConnection.provider).premiumModels,
    activeConnection.default_model,
  )

  return {
    connection: activeConnection,
    connections,
    models,
    defaultModel: defaultModel(models, activeConnection.default_model),
  }
}

async function resolveProviderForInput(input: ZetroApiConnectionInput): Promise<ProviderRuntimeConfig> {
  const savedRows = await listProviderRows()
  const explicitProviderKey = input.providerKey ? normalizeProviderKey(input.providerKey) : null
  const modelId = input.model?.trim()
  const rowByModel = modelId
    ? savedRows.find((row) => [row.default_model, row.free_models, row.premium_models].filter(Boolean).join(',').split(',').map((item) => item.trim()).includes(modelId))
    : null
  const activeRow = explicitProviderKey
    ? savedRows.find((row) => row.provider_key === explicitProviderKey)
    : rowByModel ?? savedRows.find((row) => row.is_active) ?? savedRows[0]

  if (activeRow) {
    const providerKey = normalizeProviderKey(activeRow.provider_key)
    const defaults = providerDefaults(providerKey)
    const freeModels = activeRow.free_models ?? defaults.freeModels
    const premiumModels = activeRow.premium_models ?? defaults.premiumModels
    return {
      providerKey,
      providerName: activeRow.provider_name,
      providerKind: normalizeProviderKind(activeRow.provider_kind, defaults.providerKind),
      baseUrl: activeRow.base_url,
      apiKey: decryptSecret(activeRow.api_key_ciphertext, activeRow.api_key_iv, activeRow.api_key_tag),
      requiredKeyName: defaults.requiredEnv[0] ?? 'API_KEY',
      defaultModel: activeRow.default_model,
      freeModels,
      premiumModels,
      models: zetroModels(providerKey, freeModels, premiumModels, activeRow.default_model),
      savedRowId: activeRow.id,
    }
  }

  const providerKey = explicitProviderKey ?? 'openrouter'
  const defaults = providerDefaults(providerKey)
  const envKey = providerKey === 'openrouter' ? settings.zetro.openRouterApiKey : undefined
  return {
    providerKey,
    providerName: defaults.providerName,
    providerKind: defaults.providerKind,
    baseUrl: defaults.baseUrl,
    apiKey: envKey,
    requiredKeyName: defaults.requiredEnv[0] ?? 'API_KEY',
    defaultModel: defaults.defaultModel,
    freeModels: defaults.freeModels,
    premiumModels: defaults.premiumModels,
    models: zetroModels(providerKey, defaults.freeModels, defaults.premiumModels, defaults.defaultModel),
  }
}

async function listProviderRows(): Promise<ProviderConnectionRow[]> {
  return await getDatabase()
    .selectFrom('agent_provider_connections')
    .select([
      'id',
      'provider_key',
      'provider_name',
      'provider_kind',
      'base_url',
      'api_key_ciphertext',
      'api_key_iv',
      'api_key_tag',
      'default_model',
      'free_models',
      'premium_models',
      'is_active',
      'status',
      'last_test_status',
      'last_test_message',
      'last_tested_at',
    ])
    .orderBy('is_active', 'desc')
    .orderBy('provider_key')
    .execute()
}

async function updateProviderTestState(providerKey: ZetroProviderKey, status: 'ok' | 'failed', message: string) {
  await getDatabase()
    .updateTable('agent_provider_connections')
    .set({
      last_test_status: status,
      last_test_message: message,
      last_tested_at: sql`CURRENT_TIMESTAMP`,
      status: status === 'ok' ? 'connected' : 'failed',
      updated_at: sql`CURRENT_TIMESTAMP`,
    })
    .where('provider_key', '=', providerKey)
    .execute()
}

function providerCatalog() {
  return [
    providerDefaults('openrouter'),
    providerDefaults('openai'),
    providerDefaults('gemini'),
    providerDefaults('custom'),
  ]
}

function providerDefaults(providerKey: string) {
  const key = normalizeProviderKey(providerKey)
  const defaults: Record<ZetroProviderKey, {
    providerKey: ZetroProviderKey
    providerName: string
    providerKind: ZetroProviderKind
    baseUrl: string
    defaultModel: string
    freeModels: string
    premiumModels: string
    requiredEnv: string[]
  }> = {
    openrouter: {
      providerKey: 'openrouter',
      providerName: 'OpenRouter',
      providerKind: 'openai-compatible',
      baseUrl: settings.zetro.openRouterBaseUrl.replace(/\/$/, ''),
      defaultModel: settings.zetro.defaultModel,
      freeModels: settings.zetro.freeModels,
      premiumModels: settings.zetro.premiumModels,
      requiredEnv: ['OPENROUTER_API_KEY', 'ZETRO_FREE_MODELS', 'ZETRO_PREMIUM_MODELS', 'ZETRO_DEFAULT_MODEL'],
    },
    openai: {
      providerKey: 'openai',
      providerName: 'OpenAI',
      providerKind: 'openai-compatible',
      baseUrl: 'https://api.openai.com/v1',
      defaultModel: 'gpt-4.1-mini',
      freeModels: '',
      premiumModels: 'gpt-4.1-mini,gpt-4o-mini',
      requiredEnv: ['OPENAI_API_KEY'],
    },
    gemini: {
      providerKey: 'gemini',
      providerName: 'Gemini',
      providerKind: 'gemini',
      baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
      defaultModel: 'gemini-2.5-flash',
      freeModels: 'gemini-2.5-flash',
      premiumModels: 'gemini-2.5-pro',
      requiredEnv: ['GEMINI_API_KEY'],
    },
    custom: {
      providerKey: 'custom',
      providerName: 'Custom / OpenAI Compatible',
      providerKind: 'openai-compatible',
      baseUrl: 'http://localhost:11434/v1',
      defaultModel: 'llama3.1',
      freeModels: 'llama3.1',
      premiumModels: '',
      requiredEnv: ['CUSTOM_AI_API_KEY'],
    },
  }
  return defaults[key]
}

function normalizeProviderKey(value?: string): ZetroProviderKey {
  if (value === 'openai' || value === 'gemini' || value === 'custom') return value
  return 'openrouter'
}

function normalizeProviderKind(value: string | undefined, fallback: ZetroProviderKind): ZetroProviderKind {
  return value === 'gemini' ? 'gemini' : value === 'openai-compatible' ? 'openai-compatible' : fallback
}

function optionalTrim(value?: string) {
  const trimmed = value?.trim()
  return trimmed ? trimmed : undefined
}

function recommendedUpdates(apiConnected: boolean) {
  return [
    ...(!apiConnected
      ? [{
        title: 'Connect OpenRouter API',
        detail: 'Save a provider key in the ZETRO API panel, then run Save & test so chat uses the active saved provider.',
        priority: 'high' as const,
      }]
      : [{
        title: 'Verify free and premium routing',
        detail: 'Send one test prompt to a free model and one to a premium model before enabling users broadly.',
        priority: 'medium' as const,
      }]),
    {
      title: 'Index existing docs',
      detail: 'Run adaptive learn for ZRO and assist docs before calling ZETRO a product helper.',
      priority: 'high' as const,
    },
    {
      title: 'Add encrypted secret storage',
      detail: 'Move from env-only provider keys to encrypted database-backed provider connections when admin setup is ready.',
      priority: 'medium' as const,
    },
    {
      title: 'Add RAG citations',
      detail: 'Return source file and heading with every grounded ZETRO answer.',
      priority: 'medium' as const,
    },
  ]
}

function modelLabel(modelId: string) {
  const lastPart = modelId.split('/').at(-1) ?? modelId
  return lastPart
    .replace(/[-_:]+/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

interface OpenRouterResponse {
  model?: string
  choices?: Array<{
    message?: {
      content?: string
    }
  }>
  usage?: unknown
}

interface GeminiGenerateContentResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>
    }
  }>
  usageMetadata?: unknown
}

async function callProviderChat(provider: ProviderRuntimeConfig, model: ZetroModel, message: string, localContext: ReturnType<typeof searchZetroMarkdownDocuments> = []) {
  if (provider.providerKind === 'gemini') {
    return callGemini(provider, model, message, localContext)
  }

  return callOpenAiCompatible(provider, model, message, localContext)
}

async function callOpenAiCompatible(provider: ProviderRuntimeConfig, model: ZetroModel, message: string, localContext: ReturnType<typeof searchZetroMarkdownDocuments> = []) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), settings.zetro.requestTimeoutMs)

  try {
    const response = await fetch(`${provider.baseUrl.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${provider.apiKey}`,
        'Content-Type': 'application/json',
        ...(settings.zetro.httpReferer ? { 'HTTP-Referer': settings.zetro.httpReferer } : {}),
        'X-OpenRouter-Title': settings.zetro.appTitle,
      },
      body: JSON.stringify({
        model: model.id,
        messages: zetroMessages(message, localContext),
        max_tokens: settings.zetro.maxTokens,
        temperature: settings.zetro.temperature,
      }),
      signal: controller.signal,
    })

    const rawBody = await response.text()
    if (!response.ok) {
      throw new Error(`${provider.providerName} ${response.status}: ${summarizeProviderBody(rawBody)}`)
    }

    const payload = JSON.parse(rawBody) as OpenRouterResponse
    const content = payload.choices?.[0]?.message?.content?.trim()
    if (!content) {
      throw new Error(`${provider.providerName} returned no assistant message content.`)
    }

    return {
      content,
      model: payload.model ?? model.id,
      usage: payload.usage ?? null,
    }
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`${provider.providerName} request timed out after ${settings.zetro.requestTimeoutMs}ms.`)
    }
    throw error
  } finally {
    clearTimeout(timeout)
  }
}

async function callGemini(provider: ProviderRuntimeConfig, model: ZetroModel, message: string, localContext: ReturnType<typeof searchZetroMarkdownDocuments> = []) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), settings.zetro.requestTimeoutMs)

  try {
    const response = await fetch(`${provider.baseUrl.replace(/\/$/, '')}/models/${encodeURIComponent(model.id)}:generateContent?key=${encodeURIComponent(provider.apiKey ?? '')}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: zetroSystemPrompt(localContext) }],
        },
        contents: [
          {
            role: 'user',
            parts: [{ text: message }],
          },
        ],
        generationConfig: {
          maxOutputTokens: settings.zetro.maxTokens,
          temperature: settings.zetro.temperature,
        },
      }),
      signal: controller.signal,
    })

    const rawBody = await response.text()
    if (!response.ok) {
      throw new Error(`${provider.providerName} ${response.status}: ${summarizeProviderBody(rawBody)}`)
    }

    const payload = JSON.parse(rawBody) as GeminiGenerateContentResponse
    const content = payload.candidates?.[0]?.content?.parts?.map((part) => part.text ?? '').join('').trim()
    if (!content) {
      throw new Error(`${provider.providerName} returned no assistant message content.`)
    }

    return {
      content,
      model: model.id,
      usage: payload.usageMetadata ?? null,
    }
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`${provider.providerName} request timed out after ${settings.zetro.requestTimeoutMs}ms.`)
    }
    throw error
  } finally {
    clearTimeout(timeout)
  }
}

async function testProviderConnection(provider: ProviderRuntimeConfig) {
  if (provider.providerKind === 'gemini') {
    return testGeminiConnection(provider)
  }

  return testOpenAiCompatibleConnection(provider)
}

async function testOpenAiCompatibleConnection(provider: ProviderRuntimeConfig) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), settings.zetro.requestTimeoutMs)

  try {
    const response = await fetch(`${provider.baseUrl.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${provider.apiKey}`,
        'Content-Type': 'application/json',
        ...(settings.zetro.httpReferer ? { 'HTTP-Referer': settings.zetro.httpReferer } : {}),
        'X-OpenRouter-Title': settings.zetro.appTitle,
      },
      body: JSON.stringify({
        model: provider.defaultModel,
        messages: [
          { role: 'system', content: 'You are a connection tester. Reply with ZETRO_OK only.' },
          { role: 'user', content: 'Connection test' },
        ],
        max_tokens: 16,
        temperature: 0,
      }),
      signal: controller.signal,
    })
    const rawBody = await response.text()
    if (!response.ok) {
      throw new Error(`${provider.providerName} ${response.status}: ${summarizeProviderBody(rawBody)}`)
    }

    const payload = JSON.parse(rawBody) as OpenRouterResponse
    const content = payload.choices?.[0]?.message?.content?.trim()
    if (!content) {
      throw new Error(`${provider.providerName} connected but returned no chat content for ${provider.defaultModel}.`)
    }

    return {
      modelCount: 0,
      message: `${provider.providerName} chat test passed with ${provider.defaultModel}.`,
    }
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`${provider.providerName} connection test timed out after ${settings.zetro.requestTimeoutMs}ms.`)
    }
    throw error
  } finally {
    clearTimeout(timeout)
  }
}

async function testGeminiConnection(provider: ProviderRuntimeConfig) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), settings.zetro.requestTimeoutMs)

  try {
    const response = await fetch(`${provider.baseUrl.replace(/\/$/, '')}/models/${encodeURIComponent(provider.defaultModel)}:generateContent?key=${encodeURIComponent(provider.apiKey ?? '')}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: 'You are a connection tester. Reply with ZETRO_OK only.' }],
        },
        contents: [
          {
            role: 'user',
            parts: [{ text: 'Connection test' }],
          },
        ],
        generationConfig: {
          maxOutputTokens: 16,
          temperature: 0,
        },
      }),
      signal: controller.signal,
    })
    const rawBody = await response.text()
    if (!response.ok) {
      throw new Error(`${provider.providerName} ${response.status}: ${summarizeProviderBody(rawBody)}`)
    }

    const payload = JSON.parse(rawBody) as GeminiGenerateContentResponse
    const content = payload.candidates?.[0]?.content?.parts?.map((part) => part.text ?? '').join('').trim()
    if (!content) {
      throw new Error(`${provider.providerName} connected but returned no chat content for ${provider.defaultModel}.`)
    }

    return {
      modelCount: 0,
      message: `${provider.providerName} chat test passed with ${provider.defaultModel}.`,
    }
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`${provider.providerName} connection test timed out after ${settings.zetro.requestTimeoutMs}ms.`)
    }
    throw error
  } finally {
    clearTimeout(timeout)
  }
}

async function writeAgentLog(input: {
  conversationId: number | null
  eventType: string
  message: string
  model: ZetroModel
  reply: string
  latencyMs: number
  status: 'ok' | 'blocked' | 'failed'
  errorMessage?: string
  metadata: Record<string, unknown>
}) {
  const database = getDatabase()
  await database.insertInto('agent_logs').values({
    uuid: dispatchPublicUuid(),
    conversation_id: input.conversationId,
    tenant_id: null,
    agent_id: 'zetro-helper',
    event_type: input.eventType,
    model_id: input.model.id,
    input_summary: input.message.slice(0, 500),
    output_summary: input.reply.slice(0, 500),
    metadata: JSON.stringify(input.metadata),
    latency_ms: input.latencyMs,
    status: input.status,
    error_message: input.errorMessage ?? null,
  }).execute()
}

function zetroMessages(message: string, localContext: ReturnType<typeof searchZetroMarkdownDocuments>) {
  return [
    {
      role: 'system',
      content: zetroSystemPrompt(localContext),
    },
    { role: 'user', content: message },
  ]
}

function zetroSystemPrompt(localContext: ReturnType<typeof searchZetroMarkdownDocuments>) {
  return [
    'You are ZETRO, the Versatile Agent OS assistant for this platform.',
    'This phase is read-only helper chat. Answer clearly, avoid pretending you can execute actions, and say when knowledge ingestion is not available yet.',
    'When users ask for platform automation, explain that Operator and Workflow agents are planned after the Helper Agent is grounded.',
    formatLocalContext(localContext),
  ].join(' ')
}

function formatLocalContext(localContext: ReturnType<typeof searchZetroMarkdownDocuments>) {
  if (!localContext.length) return 'No local project markdown context matched this message.'
  return [
    'Use this local project markdown context when relevant:',
    ...localContext.map((item, index) => `${index + 1}. ${item.path} / ${item.heading}: ${item.excerpt}`),
  ].join('\n')
}

function encryptSecret(secret: string) {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(), iv)
  const ciphertext = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return {
    ciphertext: ciphertext.toString('base64'),
    iv: iv.toString('base64'),
    tag: tag.toString('base64'),
  }
}

function decryptSecret(ciphertext: string, iv: string, tag: string) {
  const decipher = createDecipheriv('aes-256-gcm', encryptionKey(), Buffer.from(iv, 'base64'))
  decipher.setAuthTag(Buffer.from(tag, 'base64'))
  return Buffer.concat([
    decipher.update(Buffer.from(ciphertext, 'base64')),
    decipher.final(),
  ]).toString('utf8')
}

function encryptionKey() {
  const secret = settings.auth.jwtSecret ?? settings.zetro.appTitle ?? 'cxsun-zetro-local-secret'
  return createHash('sha256').update(secret).digest()
}

function summarizeProviderBody(body: string) {
  if (!body.trim()) return 'empty response body'

  try {
    const parsed = JSON.parse(body) as { error?: { message?: string }; message?: string }
    return parsed.error?.message ?? parsed.message ?? body.slice(0, 240)
  } catch {
    return body.slice(0, 240)
  }
}
