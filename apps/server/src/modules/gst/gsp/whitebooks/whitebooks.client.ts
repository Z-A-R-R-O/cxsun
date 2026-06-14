import { BadRequestException } from '../../../../core/exceptions/http.exception.js'
import type { GstComplianceOperation, GstProviderSettingsSecretRecord } from '../../gst-compliance/domain/gst-compliance.types.js'

export const whiteBooksSandboxBaseUrl = 'https://apisandbox.whitebooks.in'
export const whiteBooksProductionBaseUrl = 'https://api.whitebooks.in'

export interface WhiteBooksRequest {
  endpoint: string
  headers?: Record<string, unknown>
  method: 'GET' | 'POST'
  payload?: unknown
  query?: Record<string, unknown>
  token?: string
}

export interface WhiteBooksResponse {
  endpoint: string
  httpStatus: number
  method: 'GET' | 'POST'
  ok: boolean
  response: unknown
}

interface WhiteBooksOperationDefinition {
  endpoint: string
  method: 'GET' | 'POST'
  needsAuth: boolean
}

const whiteBooksOperations: Record<GstComplianceOperation, WhiteBooksOperationDefinition> = {
  authenticate: { endpoint: '/einvoice/authenticate', method: 'GET', needsAuth: false },
  gstnDetails: { endpoint: '/einvoice/type/GSTNDETAILS/version/V1_03', method: 'GET', needsAuth: true },
  syncGstinFromCommonPortal: { endpoint: '/einvoice/type/SYNC_GSTIN_FROMCP/version/V1_03', method: 'GET', needsAuth: true },
  generateIrn: { endpoint: '/einvoice/type/GENERATE/version/V1_03', method: 'POST', needsAuth: true },
  getEinvoiceByIrn: { endpoint: '/einvoice/type/GETIRN/version/V1_03', method: 'GET', needsAuth: true },
  getIrnByDocument: { endpoint: '/einvoice/type/GETIRNBYDOCDETAILS/version/V1_03', method: 'GET', needsAuth: true },
  cancelIrn: { endpoint: '/einvoice/type/CANCEL/version/V1_03', method: 'POST', needsAuth: true },
  getRejectedIrns: { endpoint: '/einvoice/type/GETREJECTEDIRNS/version/V1_03', method: 'GET', needsAuth: true },
  generateEwaybillByIrn: { endpoint: '/einvoice/type/GENERATE_EWAYBILL/version/V1_03', method: 'POST', needsAuth: true },
  getEwaybillByIrn: { endpoint: '/einvoice/type/GETEWAYBILLIRN/version/V1_03', method: 'GET', needsAuth: true },
  cancelEwaybill: { endpoint: '/einvoice/type/CANCEL_EWAYBILL/version/V1_03', method: 'POST', needsAuth: true },
  getB2cQrCode: { endpoint: '/einvoice/qrcode', method: 'GET', needsAuth: true },
}

export function whiteBooksOperationDefinition(operation: GstComplianceOperation) {
  return whiteBooksOperations[operation]
}

export async function callWhiteBooks(settings: GstProviderSettingsSecretRecord, request: WhiteBooksRequest): Promise<WhiteBooksResponse> {
  validateSettings(settings, request.token)
  const url = buildUrl(settings.baseUrl, request.endpoint, { ...(request.query ?? {}), email: settings.email })
  const response = await fetch(url, {
    body: request.method === 'POST' ? JSON.stringify(request.payload ?? {}) : undefined,
    headers: { ...whiteBooksHeaders(settings, request.token), ...cleanHeaderValues(request.headers) },
    method: request.method,
  })
  const text = await response.text()
  return {
    endpoint: request.endpoint,
    httpStatus: response.status,
    method: request.method,
    ok: response.ok,
    response: parseResponse(text),
  }
}

export function whiteBooksHeaders(settings: GstProviderSettingsSecretRecord, token?: string): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    Accept: '*/*',
    username: settings.username,
    ...(!token ? { password: settings.password } : {}),
    ip_address: settings.ipAddress || '0.0.0.0',
    client_id: settings.clientId,
    client_secret: settings.clientSecret,
    gstin: settings.gstin,
    ...(token ? { 'auth-token': token } : {}),
  }
}

export function redactedWhiteBooksHeaders(settings: GstProviderSettingsSecretRecord, token?: string): Record<string, string> {
  return {
    username: settings.username,
    ...(!token ? { password: settings.password ? '***' : '' } : {}),
    ip_address: settings.ipAddress || '0.0.0.0',
    client_id: settings.clientId ? '***' : '',
    client_secret: settings.clientSecret ? '***' : '',
    gstin: settings.gstin,
    ...(token ? { 'auth-token': '***' } : {}),
  }
}

export function redactedWhiteBooksRequestHeaders(headers?: Record<string, unknown>): Record<string, string> {
  return cleanHeaderValues(headers)
}

function validateSettings(settings: GstProviderSettingsSecretRecord, token?: string) {
  const missing = [
    !settings.email ? 'email' : '',
    !settings.username ? 'username' : '',
    !token && !settings.password ? 'password' : '',
    !settings.clientId ? 'client id' : '',
    !settings.clientSecret ? 'client secret' : '',
    !settings.gstin ? 'GSTIN' : '',
    token === '' ? 'auth token' : '',
  ].filter(Boolean)
  if (missing.length) throw new BadRequestException(`WhiteBooks setting is missing ${missing.join(', ')}.`)
}

function buildUrl(baseUrl: string, endpoint: string, query: Record<string, unknown>) {
  const url = new URL(endpoint, normalizeBaseUrl(baseUrl))
  for (const [key, value] of Object.entries(query)) {
    if (value === null || value === undefined || value === '') continue
    url.searchParams.set(key, String(value))
  }
  return url.toString()
}

function cleanHeaderValues(headers?: Record<string, unknown>) {
  const clean: Record<string, string> = {}
  for (const [key, value] of Object.entries(headers ?? {})) {
    if (value === null || value === undefined || value === '') continue
    clean[key] = String(value)
  }
  return clean
}

function normalizeBaseUrl(value: string) {
  const trimmed = value.trim() || whiteBooksSandboxBaseUrl
  return trimmed.endsWith('/') ? trimmed : `${trimmed}/`
}

function parseResponse(value: string) {
  if (!value) return null
  try {
    return JSON.parse(value) as unknown
  } catch {
    return value
  }
}
