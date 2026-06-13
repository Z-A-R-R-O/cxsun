import { Inject } from '../../../../core/decorators/inject.js'
import { Injectable } from '../../../../core/decorators/injectable.js'
import { BadRequestException, ForbiddenException, UnauthorizedException } from '../../../../core/exceptions/http.exception.js'
import { TenantContextService, type TenantRequestHeaders, type TenantRuntimeContext } from '../../../../core/tenant/tenant-context.service.js'
import { verifyJwt } from '../../../../infrastructure/auth/jwt.js'
import { whiteBooksProvider } from '../../gsp/whitebooks/index.js'
import { gstComplianceOperations, type GstComplianceOperation, type GstComplianceOperationInput, type GstProviderGlobalSettingsInput, type GstProviderSettingsInput } from '../domain/gst-compliance.types.js'
import { GstComplianceRepository } from '../infrastructure/gst-compliance.repository.js'

@Injectable()
export class GstComplianceService {
  constructor(
    @Inject(() => TenantContextService) private readonly tenantContext: TenantContextService,
    @Inject(GstComplianceRepository) private readonly compliance: GstComplianceRepository,
  ) {}

  async getSettings(headers: TenantRequestHeaders, query: Record<string, unknown>) {
    const context = await this.tenantContext.resolve(headers, 'company.manage')
    return this.compliance.getSettings(context, query.companyId, query.environment, query.purpose)
  }

  async getGlobalSettings(headers: TenantRequestHeaders, query: Record<string, unknown>) {
    requireSuperAdmin(headers)
    return this.compliance.getGlobalSettings(query.environment, query.purpose)
  }

  async saveGlobalSettings(headers: TenantRequestHeaders, input: GstProviderGlobalSettingsInput) {
    requireSuperAdmin(headers)
    return this.compliance.saveGlobalSettings(input)
  }

  async saveSettings(headers: TenantRequestHeaders, input: GstProviderSettingsInput) {
    const context = await this.tenantContext.resolve(headers, 'company.manage')
    return this.compliance.saveSettings(context, input)
  }

  async listOperations(headers: TenantRequestHeaders, query: Record<string, unknown>) {
    const context = await this.tenantContext.resolve(headers, 'company.manage')
    return this.compliance.listOperations(context, query)
  }

  async listDocuments(headers: TenantRequestHeaders, query: Record<string, unknown>) {
    const context = await this.tenantContext.resolve(headers, 'company.manage')
    return this.compliance.listDocuments(context, query)
  }

  async tokenStatus(headers: TenantRequestHeaders, query: Record<string, unknown>) {
    const context = await this.tenantContext.resolve(headers, 'company.manage')
    const settings = await this.compliance.getSettings(context, query.companyId, query.environment, query.purpose)
    if (!settings.id) return emptyTokenStatus(query.environment, query.purpose, settings.gstin)
    return this.compliance.getTokenStatus(context, settings.id, settings.purpose)
  }

  async runOperation(headers: TenantRequestHeaders, operationInput: string, input: GstComplianceOperationInput) {
    const operation = parseOperation(operationInput)
    const context = await this.tenantContext.resolve(headers, 'company.manage')
    const settings = await this.compliance.getEnabledSettings(context, input.companyId, input.environment, input.purpose)
    const definition = whiteBooksProvider.definition(operation)
    const source = this.compliance.normalizeSource(input)
    let providerResponse: unknown = null
    let httpStatus: number | null = null
    let providerStatus: string | null = null
    let success = false
    let errorMessage: string | null = null
    let authToken = ''
    const payload = operation === 'generateIrn' ? await this.withSellerDetails(context, settings, input.payload) : input.payload

    try {
      if (definition.needsAuth) {
        const token = await this.authToken(headers, settings.companyId, Boolean(input.forceRefreshToken), settings.environment, settings.purpose)
        authToken = token.authToken
      }

      const providerRequest = whiteBooksRequest(operation, input.query, settings.gstin)
      const response = await whiteBooksProvider.call(settings, {
        endpoint: definition.endpoint,
        headers: providerRequest.headers,
        method: definition.method,
        payload,
        query: providerRequest.query,
        token: definition.needsAuth ? authToken : undefined,
      })
      providerResponse = response.response
      httpStatus = response.httpStatus
      providerStatus = providerStatusFromResponse(providerResponse)
      success = response.ok && !providerErrorMessage(providerResponse)
      errorMessage = providerErrorMessage(providerResponse)
      if (operation === 'authenticate' && success) {
        const token = await this.compliance.saveToken(context, settings, providerResponse)
        success = Boolean(token.authToken)
      }
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : 'GST compliance operation failed.'
      providerResponse = { error: errorMessage }
    }

    const recordedProviderResponse = redactProviderResponse(providerResponse)
    const operationRecord = await this.compliance.recordOperation(context, {
      endpoint: definition.endpoint,
      errorMessage,
      httpStatus,
      method: definition.method,
      operation,
      providerResponse: recordedProviderResponse,
      providerStatus,
      requestJson: {
        headers: {
          ...whiteBooksProvider.redactedHeaders(settings, definition.needsAuth ? authToken : undefined),
          ...whiteBooksProvider.redactedRequestHeaders(whiteBooksRequest(operation, input.query, settings.gstin).headers),
        },
        payload: payload ?? null,
        query: { ...whiteBooksRequest(operation, input.query, settings.gstin).query, email: settings.email },
      },
      settings,
      source,
      success,
    })
    const document = success ? await this.compliance.upsertDocumentFromOperation(context, settings, source, operationRecord, providerResponse) : null
    return { ok: success, document, error: errorMessage, operation: operationRecord, response: recordedProviderResponse }
  }

  private async authToken(headers: TenantRequestHeaders, companyId: string, forceRefresh: boolean, environment?: string, purpose?: string) {
    const context = await this.tenantContext.resolve(headers, 'company.manage')
    const settings = await this.compliance.getEnabledSettings(context, companyId, environment, purpose)
    if (!forceRefresh) {
      const cached = await this.compliance.getCachedToken(context, settings.id, settings.purpose)
      if (cached) return cached
    }
    const definition = whiteBooksProvider.definition('authenticate')
    const response = await whiteBooksProvider.call(settings, { endpoint: definition.endpoint, method: definition.method })
    const token = await this.compliance.saveToken(context, settings, response.response)
    await this.compliance.recordOperation(context, {
      endpoint: definition.endpoint,
      httpStatus: response.httpStatus,
      method: definition.method,
      operation: 'authenticate',
      providerResponse: redactProviderResponse(response.response),
      providerStatus: providerStatusFromResponse(response.response),
      requestJson: { headers: whiteBooksProvider.redactedHeaders(settings), query: { email: settings.email } },
      settings,
      source: { documentDate: null, documentNo: null, sourceId: null, sourceType: null, sourceUuid: null },
      success: response.ok && Boolean(token.authToken),
    })
    return token
  }

  private async withSellerDetails(context: TenantRuntimeContext, settings: { companyId: string; gstin: string }, payload: unknown) {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return payload
    const record = payload as Record<string, unknown>
    if (record.SellerDtls && typeof record.SellerDtls === 'object') return payload
    const company = await context.database
      .selectFrom('companies')
      .select(['id', 'name', 'legal_name'])
      .where('id', '=', Number(settings.companyId))
      .where('deleted_at', 'is', null)
      .executeTakeFirst()
    if (!company) return payload
    const address = await context.database
      .selectFrom('address_book')
      .select(['address_line1', 'address_line2'])
      .where('owner_type', '=', 'company')
      .where('owner_id', '=', Number(company.id))
      .where('is_active', '=', true)
      .orderBy('is_default', 'desc')
      .orderBy('id', 'asc')
      .executeTakeFirst()
    const legalName = stringOrNull(company.legal_name) ?? company.name
    const stateCode = settings.gstin.slice(0, 2) || '33'
    return {
      ...record,
      SellerDtls: {
        Gstin: settings.gstin,
        LglNm: legalName,
        TrdNm: company.name,
        Addr1: stringOrNull(address?.address_line1) ?? '-',
        Addr2: stringOrNull(address?.address_line2) ?? undefined,
        Loc: 'Tamil Nadu',
        Pin: 999999,
        Stcd: stateCode,
      },
    }
  }
}

function requireSuperAdmin(headers: TenantRequestHeaders) {
  const auth = verifyJwt(bearerToken(firstHeader(headers.authorization)))
  if (!auth) throw new UnauthorizedException('Authentication is required.')
  if (auth.identitySource !== 'platform' || auth.role !== 'super-admin') {
    throw new ForbiddenException('Super-admin access is required.')
  }
}

function whiteBooksRequest(operation: GstComplianceOperation, queryInput: Record<string, unknown> | undefined, supplierGstin: string) {
  const query = { ...(queryInput ?? {}) }
  const headers: Record<string, unknown> = {}
  if (operation === 'getEinvoiceByIrn') {
    query.param1 = query.param1 || query.irn
    delete query.irn
  }
  if (operation === 'getIrnByDocument') {
    query.param1 = query.param1 || query.doctype || 'INV'
    headers.docnum = query.docnum
    headers.docdate = query.docdate
    delete query.doctype
    delete query.docnum
    delete query.docdate
  }
  if (operation === 'getEwaybillByIrn') {
    query.param1 = query.param1 || query.irn
    query.supplier_gstn = query.supplier_gstn || supplierGstin
    delete query.irn
  }
  if (operation === 'getB2cQrCode') {
    const headerKeys = ['sgstin', 'docno', 'docdate', 'totinvval', 'upiid', 'bankaccno', 'bankifsccode', 'accountholdername', 'igstamount', 'cgstamount', 'sgstamount', 'cessamount']
    for (const key of headerKeys) {
      headers[key] = query[key]
      delete query[key]
    }
  }
  return { headers, query }
}

function redactProviderResponse(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redactProviderResponse)
  if (!value || typeof value !== 'object') return value
  return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, entry]) => [
    key,
    isSensitiveProviderKey(key) ? '***' : redactProviderResponse(entry),
  ]))
}

function isSensitiveProviderKey(key: string) {
  return ['authtoken', 'auth-token', 'client_id', 'clientid', 'clientsecret', 'client_secret', 'password', 'sek', 'token'].includes(key.toLowerCase())
}

function parseOperation(value: string): GstComplianceOperation {
  if (gstComplianceOperations.includes(value as GstComplianceOperation)) return value as GstComplianceOperation
  throw new BadRequestException('Unsupported GST compliance operation.')
}

function providerStatusFromResponse(value: unknown) {
  if (!value || typeof value !== 'object') return null
  const record = value as Record<string, unknown>
  return stringOrNull(record.status_cd) ?? stringOrNull(record.status) ?? stringOrNull(record.Status) ?? stringOrNull(record.statusCode)
}

function providerErrorMessage(value: unknown) {
  if (!value || typeof value !== 'object') return null
  const record = value as Record<string, unknown>
  const status = stringOrNull(record.status_cd)?.toLowerCase()
  if (status && !['1', 'success', 'sucess', 'succeeded'].includes(status)) {
    return errorText(value) ?? 'Provider returned an error.'
  }
  return stringOrNull(record.error) ?? errorDetailsText(record.errorDetails) ?? null
}

function emptyTokenStatus(environment: unknown, purpose: unknown, gstin: unknown) {
  return {
    environment: environment === 'production' ? 'production' : 'sandbox',
    expiresInSeconds: null,
    gstin: stringOrNull(gstin),
    hasToken: false,
    isExpired: false,
    provider: null,
    purpose: purpose === 'eway_only' ? 'eway_only' : 'einvoice_eway',
    tokenExpiry: null,
    tokenPreview: null,
    updatedAt: null,
  }
}

function stringOrNull(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function firstHeader(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value
}

function bearerToken(value?: string) {
  return value?.startsWith('Bearer ') ? value.slice(7) : undefined
}

function errorText(value: unknown): string | null {
  if (!value || typeof value !== 'object') return null
  const record = value as Record<string, unknown>
  return parsedProviderMessage(record.status_desc)
    ?? stringOrNull(record.error)
    ?? stringOrNull(record.message)
    ?? errorDetailsText(record.errorDetails)
    ?? errorDetailsText(record.ErrorDetails)
    ?? errorText(record.data)
}

function parsedProviderMessage(value: unknown): string | null {
  const text = stringOrNull(value)
  if (!text) return null
  try {
    const parsed = JSON.parse(text) as unknown
    return errorDetailsText(parsed) ?? text
  } catch {
    return text
  }
}

function errorDetailsText(value: unknown): string | null {
  if (!Array.isArray(value)) return null
  const parts = value
    .map((item) => {
      if (!item || typeof item !== 'object') return null
      const record = item as Record<string, unknown>
      const code = stringOrNull(record.ErrorCode) ?? stringOrNull(record.errorCode) ?? stringOrNull(record.code)
      const message = stringOrNull(record.ErrorMessage) ?? stringOrNull(record.errorMessage) ?? stringOrNull(record.message)
      return [code, message].filter(Boolean).join(': ')
    })
    .filter(Boolean)
  return parts.length ? parts.join('; ') : null
}
