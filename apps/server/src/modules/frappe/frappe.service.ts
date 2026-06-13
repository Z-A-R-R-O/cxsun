import { Inject } from '../../core/decorators/inject.js'
import { Injectable } from '../../core/decorators/injectable.js'
import { BadRequestException } from '../../core/exceptions/http.exception.js'
import { TenantContextService, type TenantRequestHeaders } from '../../core/tenant/tenant-context.service.js'
import { MasterQueueService } from '../../infrastructure/queue/master-queue.service.js'
import { FrappeRepository } from './frappe.repository.js'
import type {
  FrappeConnectionValidation,
  FrappeResourcePostInput,
  FrappeSettings,
  FrappeSettingsInput,
  FrappeSyncJobInput,
} from './frappe.types.js'

@Injectable()
export class FrappeService {
  constructor(
    @Inject(() => TenantContextService) private readonly tenants: TenantContextService,
    @Inject(FrappeRepository) private readonly frappe: FrappeRepository,
    @Inject(MasterQueueService) private readonly queue: MasterQueueService,
  ) {}

  async workspace(headers: TenantRequestHeaders) {
    const context = await this.tenants.resolve(headers, 'company.manage')
    return this.frappe.workspace(context)
  }

  async saveSettings(headers: TenantRequestHeaders, input: FrappeSettingsInput) {
    const context = await this.tenants.resolve(headers, 'company.manage')
    const settings = await this.frappe.saveSettings(context, input ?? {})
    return { ok: true, settings, workspace: await this.frappe.workspace(context) }
  }

  async validateConnection(headers: TenantRequestHeaders, input: FrappeSettingsInput) {
    const context = await this.tenants.resolve(headers, 'company.manage')
    const savedSettings = await this.frappe.saveSettings(context, input ?? {})
    const validation = await validateFrappeConnection(savedSettings)
    const settings = await this.frappe.saveSettings(context, {
      enabled: validation.ok,
      settings: {
        handshake: validation,
        mode: 'handshake-first',
      },
    })

    return {
      ok: validation.ok,
      validation,
      settings,
      workspace: await this.frappe.workspace(context),
    }
  }

  async createJob(headers: TenantRequestHeaders, input: FrappeSyncJobInput) {
    const context = await this.tenants.resolve(headers, 'company.manage')
    const workspace = await this.frappe.createJob(context, input ?? {})
    await this.queue.enqueue({
      type: 'frappe.sync.requested',
      payload: {
        tenantId: context.tenant.id,
        requestedBy: context.user.email,
        jobType: input?.job_type ?? 'single-operation',
        direction: input?.direction ?? workspace.jobs[0]?.direction ?? 'export',
        payload: input?.payload ?? null,
      },
    })
    return { ok: true, workspace }
  }

  async getRemoteRecords(headers: TenantRequestHeaders, query: Record<string, unknown>) {
    const context = await this.tenants.resolve(headers, 'company.manage')
    const settings = await this.requireValidatedSettings(context)
    const doctype = sanitizeDoctype(query.doctype)
    const limit = Math.min(Math.max(Number(query.limit ?? 20) || 20, 1), 100)
    const fields = typeof query.fields === 'string' && query.fields.trim() ? query.fields.trim() : '["name","modified"]'
    const path = `/api/resource/${encodeURIComponent(doctype)}?fields=${encodeURIComponent(fields)}&limit_page_length=${limit}`
    const result = await frappeRequest(settings, { path })
    const data = await readFrappePayload(result.response)

    await this.frappe.saveRemoteLink(context, {
      doctype,
      direction: 'import',
      record_label: `${doctype} preview`,
      status: result.response.ok ? 'synced' : 'failed',
      last_error: result.response.ok ? null : await readFrappeErrorText(result.response, data),
      payload: data,
    })

    return {
      ok: result.response.ok,
      doctype,
      direction: 'get',
      status: result.response.status,
      latency_ms: result.latencyMs,
      data,
    }
  }

  async postRemoteRecord(headers: TenantRequestHeaders, input: FrappeResourcePostInput) {
    const context = await this.tenants.resolve(headers, 'company.manage')
    const settings = await this.requireValidatedSettings(context)
    const doctype = sanitizeDoctype(input?.doctype)
    if (!input?.data || typeof input.data !== 'object' || Array.isArray(input.data)) {
      throw new BadRequestException('Frappe post requires a JSON object in data.')
    }

    const result = await frappeRequest(settings, {
      path: `/api/resource/${encodeURIComponent(doctype)}`,
      method: 'POST',
      body: JSON.stringify(input.data),
    })
    const data = await readFrappePayload(result.response)
    const remoteName = remoteNameFromPayload(data)

    await this.frappe.saveRemoteLink(context, {
      doctype,
      direction: 'export',
      remote_name: remoteName,
      record_label: remoteName || `${doctype} post`,
      status: result.response.ok ? 'synced' : 'failed',
      last_error: result.response.ok ? null : await readFrappeErrorText(result.response, data),
      payload: data,
    })

    return {
      ok: result.response.ok,
      doctype,
      direction: 'post',
      status: result.response.status,
      latency_ms: result.latencyMs,
      data,
    }
  }

  private async requireValidatedSettings(context: Awaited<ReturnType<TenantContextService['resolve']>>) {
    const settings = await this.frappe.settings(context)
    if (!settings.enabled) {
      throw new BadRequestException('Verify Frappe connection before running remote operations.')
    }
    return settings
  }
}

async function validateFrappeConnection(settings: FrappeSettings): Promise<FrappeConnectionValidation> {
  const checkedAt = new Date().toISOString()

  if (!settings.base_url || !settings.api_key || !settings.api_secret) {
    return {
      ok: false,
      endpoint: frappeEndpoint(settings, '/api/method/frappe.auth.get_logged_user'),
      site_name: settings.site_name,
      checked_at: checkedAt,
      http_status: null,
      authenticated_user: null,
      latency_ms: null,
      detail: 'Frappe base URL, API token, and API secret are required before validating the handshake.',
      response_excerpt: null,
    }
  }

  try {
    const result = await frappeRequest(settings, {
      path: '/api/method/frappe.auth.get_logged_user',
    })
    const payload = await readFrappePayload(result.response)
    const authenticatedUser = messageFromPayload(payload)

    if (!result.response.ok || !authenticatedUser) {
      const detail = !result.response.ok
        ? await readFrappeErrorText(result.response, payload)
        : 'Frappe returned HTTP 200 but did not return the authenticated user.'
      return {
        ok: false,
        endpoint: frappeEndpoint(settings, '/api/method/frappe.auth.get_logged_user'),
        site_name: settings.site_name,
        checked_at: checkedAt,
        http_status: result.response.status,
        authenticated_user: null,
        latency_ms: result.latencyMs,
        detail,
        response_excerpt: excerpt(payload),
      }
    }

    return {
      ok: true,
      endpoint: frappeEndpoint(settings, '/api/method/frappe.auth.get_logged_user'),
      site_name: settings.site_name,
      checked_at: checkedAt,
      http_status: result.response.status,
      authenticated_user: authenticatedUser,
      latency_ms: result.latencyMs,
      detail: `Frappe handshake verified as ${authenticatedUser}.`,
      response_excerpt: excerpt(payload),
    }
  } catch (error) {
    return {
      ok: false,
      endpoint: frappeEndpoint(settings, '/api/method/frappe.auth.get_logged_user'),
      site_name: settings.site_name,
      checked_at: checkedAt,
      http_status: null,
      authenticated_user: null,
      latency_ms: null,
      detail: error instanceof Error ? error.message : 'Unable to reach Frappe.',
      response_excerpt: null,
    }
  }
}

async function frappeRequest(settings: FrappeSettings, input: { path: string; method?: string; body?: string }) {
  if (!settings.api_key || !settings.api_secret) {
    throw new BadRequestException('Frappe API token and API secret are required.')
  }

  const headers = new Headers()
  headers.set('authorization', `token ${settings.api_key}:${settings.api_secret}`)
  headers.set('accept', 'application/json')
  if (settings.site_name) headers.set('x-frappe-site-name', settings.site_name)
  if (input.body) headers.set('content-type', 'application/json')

  const startedAt = Date.now()
  const response = await fetch(frappeEndpoint(settings, input.path), {
    method: input.method ?? 'GET',
    headers,
    body: input.body,
    signal: AbortSignal.timeout((settings.timeout_seconds || 30) * 1000),
  })

  return {
    response,
    latencyMs: Math.max(0, Date.now() - startedAt),
  }
}

function frappeEndpoint(settings: FrappeSettings, path: string) {
  return `${settings.base_url.replace(/\/+$/, '')}${path}`
}

async function readFrappePayload(response: Response) {
  const contentType = response.headers.get('content-type') ?? ''
  if (contentType.includes('application/json')) {
    return await response.json().catch(() => null)
  }
  return await response.text().catch(() => '')
}

async function readFrappeErrorText(response: Response, parsedPayload?: unknown) {
  const payload = parsedPayload === undefined ? await readFrappePayload(response) : parsedPayload
  if (payload && typeof payload === 'object') {
    const item = payload as Record<string, unknown>
    const detail = [
      typeof item.message === 'string' ? item.message : '',
      typeof item.exception === 'string' ? item.exception : '',
      typeof item.exc_type === 'string' ? item.exc_type : '',
    ].map((value) => value.trim()).filter(Boolean).join(' | ')
    return detail || `HTTP ${response.status}`
  }
  return typeof payload === 'string' && payload.trim() ? payload.trim() : `HTTP ${response.status}`
}

function messageFromPayload(payload: unknown) {
  return payload && typeof payload === 'object' && typeof (payload as Record<string, unknown>).message === 'string'
    ? String((payload as Record<string, unknown>).message).trim()
    : ''
}

function remoteNameFromPayload(payload: unknown) {
  if (!payload || typeof payload !== 'object') return null
  const data = (payload as Record<string, unknown>).data
  if (!data || typeof data !== 'object') return null
  const name = (data as Record<string, unknown>).name
  return typeof name === 'string' && name.trim() ? name.trim() : null
}

function sanitizeDoctype(value: unknown) {
  const text = typeof value === 'string' ? value.trim() : ''
  if (!text || !/^[A-Za-z0-9 _-]+$/.test(text)) {
    throw new BadRequestException('A valid Frappe DocType is required.')
  }
  return text
}

function excerpt(value: unknown) {
  const text = typeof value === 'string' ? value : JSON.stringify(value)
  return text.length > 500 ? `${text.slice(0, 500)}...` : text
}
