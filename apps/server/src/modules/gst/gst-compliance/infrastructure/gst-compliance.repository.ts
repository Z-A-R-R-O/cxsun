import { type Kysely } from 'kysely'
import { BadRequestException, NotFoundException } from '../../../../core/exceptions/http.exception.js'
import { Injectable } from '../../../../core/decorators/injectable.js'
import { getDatabase } from '../../../../infrastructure/database/connection.js'
import type { TenantRuntimeContext } from '../../../../core/tenant/tenant-context.service.js'
import { gspConfig } from '../../../../framework/config/index.js'
import { dispatchPublicUuid } from '../../../../shared/helpers/public-uuid.js'
import { whiteBooksProductionBaseUrl, whiteBooksSandboxBaseUrl } from '../../gsp/whitebooks/index.js'
import type {
  GstComplianceDocumentRecord,
  GstComplianceOperation,
  GstComplianceOperationInput,
  GstComplianceOperationRecord,
  GstProvider,
  GstProviderEnvironment,
  GstProviderPurpose,
  GstProviderGlobalSettingsInput,
  GstProviderGlobalSettingsRecord,
  GstProviderSettingsInput,
  GstProviderSettingsRecord,
  GstProviderSettingsSecretRecord,
} from '../domain/gst-compliance.types.js'

type DynamicDatabase = Record<string, Record<string, unknown>>

interface OperationLogInput {
  endpoint: string
  errorCode?: string | null
  errorMessage?: string | null
  gatewayStatus?: string | null
  httpStatus?: number | null
  method: string
  operation: GstComplianceOperation
  providerResponse: unknown
  providerStatus?: string | null
  requestJson: Record<string, unknown>
  retryState?: string | null
  settings: GstProviderSettingsSecretRecord
  source: NormalizedOperationSource
  success: boolean
}

interface NormalizedOperationSource {
  documentDate: string | null
  documentNo: string | null
  sourceId: number | null
  sourceType: string | null
  sourceUuid: string | null
}

@Injectable()
export class GstComplianceRepository {
  async getGlobalSettings(environmentInput?: unknown, purposeInput?: unknown) {
    const environment = environmentValue(environmentInput ?? gspConfig.environment)
    const purpose = purposeValue(purposeInput)
    const row = await getDatabase()
      .selectFrom('gst_provider_global_settings')
      .selectAll()
      .where('provider', '=', 'whitebooks')
      .where('environment', '=', environment)
      .where('purpose', '=', purpose)
      .executeTakeFirst()
    return row ? toGlobalSettingsRecord(row) : envGlobalSettingsRecord(environment, purpose)
  }

  async saveGlobalSettings(input: GstProviderGlobalSettingsInput) {
    const environment = environmentValue(input.environment ?? gspConfig.environment)
    const purpose = purposeValue(input.purpose)
    const existing = await getDatabase()
      .selectFrom('gst_provider_global_settings')
      .selectAll()
      .where('provider', '=', providerValue(input.provider))
      .where('environment', '=', environment)
      .where('purpose', '=', purpose)
      .executeTakeFirst()
    const values = globalSettingsValues(input, existing)
    if (existing) {
      await getDatabase()
        .updateTable('gst_provider_global_settings')
        .set({ ...values, updated_at: nowSqlString() })
        .where('id', '=', Number(existing.id))
        .execute()
      return this.getGlobalSettings(environment, purpose)
    }
    await getDatabase()
      .insertInto('gst_provider_global_settings')
      .values({ ...values, uuid: dispatchPublicUuid() })
      .execute()
    return this.getGlobalSettings(environment, purpose)
  }

  async getSettings(context: TenantRuntimeContext, companyIdInput: unknown, environmentInput?: unknown, purposeInput?: unknown) {
    const companyId = await resolveCompanyId(context, companyIdInput)
    const environment = environmentValue(environmentInput ?? gspConfig.environment)
    const row = await this.database(context)
      .selectFrom('gst_provider_settings')
      .selectAll()
      .where('tenant_id', '=', context.tenant.id)
      .where('company_id', '=', companyId)
      .where('provider', '=', 'whitebooks')
      .where('environment', '=', environment)
      .orderBy('id', 'desc')
      .executeTakeFirst()
    const global = await this.getGlobalSettings(environment, purposeInput)
    return row ? mergeSettingsRecord(toSettingsRecord(row), global) : mergeSettingsRecord(emptySettingsRecord(companyId, environment), global)
  }

  async saveSettings(context: TenantRuntimeContext, input: GstProviderSettingsInput) {
    const companyId = await resolveCompanyId(context, input.companyId)
    const existing = await this.database(context)
      .selectFrom('gst_provider_settings')
      .selectAll()
      .where('tenant_id', '=', context.tenant.id)
      .where('company_id', '=', companyId)
      .where('provider', '=', providerValue(input.provider))
      .where('environment', '=', environmentValue(input.environment))
      .where('gstin', '=', cleanGstin(input.gstin))
      .executeTakeFirst()

    const global = await this.getGlobalSettings(input.environment)
    const values = settingsValues(input, existing, global)
    if (existing) {
      await this.database(context)
        .updateTable('gst_provider_settings')
        .set({ ...values, updated_at: new Date() })
        .where('id', '=', Number(existing.id))
        .where('tenant_id', '=', context.tenant.id)
        .execute()
      return this.getSettings(context, companyId, values.environment)
    }

    await this.database(context)
      .insertInto('gst_provider_settings')
      .values({ ...values, uuid: dispatchPublicUuid(), tenant_id: context.tenant.id, company_id: companyId })
      .execute()
    return this.getSettings(context, companyId, values.environment)
  }

  async getEnabledSettings(context: TenantRuntimeContext, companyIdInput: unknown, environmentInput?: unknown, purposeInput?: unknown) {
    const companyId = await resolveCompanyId(context, companyIdInput)
    const environment = environmentValue(environmentInput ?? gspConfig.environment)
    const row = await this.database(context)
      .selectFrom('gst_provider_settings')
      .selectAll()
      .where('tenant_id', '=', context.tenant.id)
      .where('company_id', '=', companyId)
      .where('provider', '=', 'whitebooks')
      .where('environment', '=', environment)
      .orderBy('id', 'desc')
      .executeTakeFirst()
    const global = await this.getGlobalSettings(environment, purposeInput)
    if (!global.isEnabled) throw new BadRequestException('GSP provider settings are not enabled for this environment.')
    if (!row || !booleanValue(row.is_enabled)) throw new BadRequestException('Tenant GST API settings are not enabled for this company and environment.')
    return mergeSettingsSecretRecord(toSettingsSecretRecord(row), global)
  }

  async getCachedToken(context: TenantRuntimeContext, settingId: string, purpose: GstProviderPurpose) {
    const row = await this.database(context)
      .selectFrom('gst_provider_tokens')
      .selectAll()
      .where('tenant_id', '=', context.tenant.id)
      .where('setting_id', '=', Number(settingId))
      .where('purpose', '=', purpose)
      .executeTakeFirst()
    if (!row?.auth_token) return null
    const expiry = toDateOrNull(row.token_expiry)
    if (expiry && expiry.getTime() <= Date.now() + 60_000) return null
    return { authToken: String(row.auth_token), tokenExpiry: expiry, rawResponse: parseJson(row.raw_response_json) }
  }

  async getTokenStatus(context: TenantRuntimeContext, settingId: string, purpose: GstProviderPurpose) {
    const row = await this.database(context)
      .selectFrom('gst_provider_tokens')
      .select(['auth_token', 'environment', 'gstin', 'provider', 'purpose', 'token_expiry', 'updated_at'])
      .where('tenant_id', '=', context.tenant.id)
      .where('setting_id', '=', Number(settingId))
      .where('purpose', '=', purpose)
      .executeTakeFirst()
    const tokenExpiry = toDateOrNull(row?.token_expiry)
    const expiresInSeconds = tokenExpiry ? Math.max(0, Math.floor((tokenExpiry.getTime() - Date.now()) / 1000)) : null
    return {
      environment: row ? environmentValue(row.environment) : null,
      expiresInSeconds,
      gstin: stringOrNull(row?.gstin),
      hasToken: Boolean(row),
      isExpired: tokenExpiry ? tokenExpiry.getTime() <= Date.now() + 60_000 : false,
      provider: row ? providerValue(row.provider) : null,
      purpose: row ? purposeValue(row.purpose) : null,
      tokenPreview: tokenPreview(row?.auth_token),
      tokenExpiry,
      updatedAt: row ? toDate(row.updated_at) : null,
    }
  }

  async saveToken(context: TenantRuntimeContext, settings: GstProviderSettingsSecretRecord, response: unknown) {
    const authToken = findString(response, ['AuthToken', 'authtoken', 'auth_token', 'token'])
    if (!authToken) throw new BadRequestException('WhiteBooks authentication response did not include an auth token.')
    const tokenExpiry = parseTokenExpiry(findString(response, ['TokenExpiry', 'tokenExpiry', 'expiry', 'expires']))
    const sek = findString(response, ['Sek', 'sek'])
    const existing = await this.database(context)
      .selectFrom('gst_provider_tokens')
      .select('id')
      .where('tenant_id', '=', context.tenant.id)
      .where('setting_id', '=', Number(settings.id))
      .where('purpose', '=', settings.purpose)
      .executeTakeFirst()
    const values = {
      auth_token: authToken,
      environment: settings.environment,
      gstin: settings.gstin,
      provider: settings.provider,
      purpose: settings.purpose,
      raw_response_json: JSON.stringify(redactStoredSecretResponse(response)),
      sek,
      token_expiry: tokenExpiry,
      updated_at: new Date(),
    }
    if (existing) {
      await this.database(context).updateTable('gst_provider_tokens').set(values).where('id', '=', existing.id).execute()
    } else {
      await this.database(context).insertInto('gst_provider_tokens').values({ ...values, uuid: dispatchPublicUuid(), tenant_id: context.tenant.id, setting_id: Number(settings.id) }).execute()
    }
    return { authToken, tokenExpiry, rawResponse: response }
  }

  async listOperations(context: TenantRuntimeContext, query: Record<string, unknown>) {
    const companyId = await resolveCompanyId(context, query.companyId)
    const environment = stringOrNull(query.environment)
    const sourceType = stringOrNull(query.sourceType)
    const sourceUuid = stringOrNull(query.sourceUuid)
    let request = this.database(context)
      .selectFrom('gst_compliance_operations')
      .selectAll()
      .where('tenant_id', '=', context.tenant.id)
      .where('company_id', '=', companyId)
      .orderBy('id', 'desc')
      .limit(100)
    if (environment) request = request.where('environment', '=', environmentValue(environment))
    if (sourceType) request = request.where('source_type', '=', sourceType)
    if (sourceUuid) request = request.where('source_uuid', '=', sourceUuid)
    const rows = await request.execute()
    return rows.map(toOperationRecord)
  }

  async listDocuments(context: TenantRuntimeContext, query: Record<string, unknown>) {
    const companyId = await resolveCompanyId(context, query.companyId)
    const environment = stringOrNull(query.environment)
    const sourceType = stringOrNull(query.sourceType)
    let request = this.database(context)
      .selectFrom('gst_compliance_documents')
      .selectAll()
      .where('tenant_id', '=', context.tenant.id)
      .where('company_id', '=', companyId)
      .orderBy('id', 'desc')
      .limit(100)
    if (environment) request = request.where('environment', '=', environmentValue(environment))
    if (sourceType) request = request.where('source_type', '=', sourceType)
    const rows = await request.execute()
    return rows.map(toDocumentRecord)
  }

  async recordOperation(context: TenantRuntimeContext, input: OperationLogInput) {
    const result = await this.database(context)
      .insertInto('gst_compliance_operations')
      .values({
        uuid: dispatchPublicUuid(),
        tenant_id: context.tenant.id,
        company_id: Number(input.settings.companyId),
        setting_id: Number(input.settings.id),
        provider: input.settings.provider,
        environment: input.settings.environment,
        operation: input.operation,
        source_type: input.source.sourceType,
        source_id: input.source.sourceId,
        source_uuid: input.source.sourceUuid,
        document_no: input.source.documentNo,
        method: input.method,
        endpoint: input.endpoint,
        http_status: input.httpStatus ?? null,
        provider_status: input.providerStatus ?? null,
        gateway_status: input.gatewayStatus ?? input.providerStatus ?? null,
        success: input.success,
        error_code: input.errorCode ?? null,
        error_message: input.errorMessage ?? null,
        retry_state: input.retryState ?? (input.success ? 'none' : 'failed'),
        retry_count: 0,
        next_retry_at: null,
        generated_at: generatedAt(input.operation, input.success),
        cancelled_at: cancelledAt(input.operation, input.success),
        request_json: JSON.stringify(input.requestJson),
        response_json: JSON.stringify(input.providerResponse ?? null),
        created_by: context.user.email,
      })
      .executeTakeFirst()
    const operation = await this.findOperation(context, Number(result.insertId))
    if (!operation) throw new NotFoundException('GST compliance operation was not recorded.')
    return operation
  }

  async upsertDocumentFromOperation(context: TenantRuntimeContext, settings: GstProviderSettingsSecretRecord, source: NormalizedOperationSource, operation: GstComplianceOperationRecord, response: unknown) {
    if (!source.sourceType || (!source.sourceUuid && !source.documentNo)) return null
    let existingRequest = this.database(context)
      .selectFrom('gst_compliance_documents')
      .selectAll()
      .where('tenant_id', '=', context.tenant.id)
      .where('company_id', '=', Number(settings.companyId))
      .where('source_type', '=', source.sourceType)
    existingRequest = source.sourceUuid
      ? existingRequest.where('source_uuid', '=', source.sourceUuid)
      : existingRequest.where('document_no', '=', source.documentNo ?? '')
    const existing = await existingRequest.executeTakeFirst()
    const patch = documentPatch(operation.operation, response)
    const values = {
      ...patch,
      company_id: Number(settings.companyId),
      provider: settings.provider,
      environment: settings.environment,
      source_type: source.sourceType,
      source_id: source.sourceId,
      source_uuid: source.sourceUuid,
      document_type: documentTypeFromSource(source.sourceType),
      document_no: source.documentNo ?? findString(response, ['DocNo', 'documentNo']) ?? '',
      document_date: source.documentDate,
      gstin: settings.gstin,
      last_operation_id: Number(operation.id),
      updated_at: new Date(),
    }
    if (existing) {
      await this.database(context)
        .updateTable('gst_compliance_documents')
        .set(values)
        .where('id', '=', Number(existing.id))
        .execute()
      return this.findDocument(context, Number(existing.id))
    }
    await this.database(context)
      .insertInto('gst_compliance_documents')
      .values({
        ...values,
        uuid: dispatchPublicUuid(),
        tenant_id: context.tenant.id,
      })
      .execute()
    const row = await this.database(context).selectFrom('gst_compliance_documents').select('id').where('uuid', 'is not', null).orderBy('id', 'desc').executeTakeFirst()
    return row ? this.findDocument(context, Number(row.id)) : null
  }

  normalizeSource(input: GstComplianceOperationInput): NormalizedOperationSource {
    return {
      documentDate: stringOrNull(input.documentDate),
      documentNo: stringOrNull(input.documentNo),
      sourceId: numberOrNull(input.sourceId),
      sourceType: stringOrNull(input.sourceType),
      sourceUuid: stringOrNull(input.sourceUuid),
    }
  }

  private async findOperation(context: TenantRuntimeContext, id: number) {
    const row = await this.database(context).selectFrom('gst_compliance_operations').selectAll().where('tenant_id', '=', context.tenant.id).where('id', '=', id).executeTakeFirst()
    return row ? toOperationRecord(row) : null
  }

  private async findDocument(context: TenantRuntimeContext, id: number) {
    const row = await this.database(context).selectFrom('gst_compliance_documents').selectAll().where('tenant_id', '=', context.tenant.id).where('id', '=', id).executeTakeFirst()
    return row ? toDocumentRecord(row) : null
  }

  private database(context: TenantRuntimeContext) {
    return context.database as unknown as Kysely<DynamicDatabase>
  }
}

async function resolveCompanyId(context: TenantRuntimeContext, value: unknown) {
  const numericValue = Number(value)
  if (Number.isInteger(numericValue) && numericValue > 0) return numericValue
  const row = await context.database.selectFrom('companies').select('id').where('deleted_at', 'is', null).orderBy('is_primary', 'desc').orderBy('id', 'asc').executeTakeFirst()
  return Number(row?.id ?? 0)
}

function globalSettingsValues(input: GstProviderGlobalSettingsInput, existing: Record<string, unknown> | undefined) {
  const environment = environmentValue(input.environment ?? existing?.environment)
  return {
    provider: providerValue(input.provider),
    environment,
    purpose: purposeValue(input.purpose ?? existing?.purpose),
    base_url: cleanUrl(input.baseUrl) || stringValue(existing?.base_url) || defaultBaseUrl(environment),
    email: stringValue(input.email) || stringValue(existing?.email),
    client_id: stringValue(input.clientId) || stringValue(existing?.client_id),
    client_secret: secretValue(input, 'clientSecret', existing?.client_secret),
    ip_address: stringValue(input.ipAddress) || stringValue(existing?.ip_address) || '0.0.0.0',
    is_enabled: booleanValue(input.isEnabled ?? existing?.is_enabled) ? 1 : 0,
  }
}

function settingsValues(input: GstProviderSettingsInput, existing: Record<string, unknown> | undefined, global: GstProviderGlobalSettingsRecord) {
  const environment = environmentValue(input.environment ?? existing?.environment)
  const existingEnvironment = environmentValue(existing?.environment)
  return {
    provider: providerValue(input.provider),
    environment,
    base_url: global.baseUrl || cleanUrl(input.baseUrl) || (existing && environment === existingEnvironment ? stringValue(existing.base_url) : '') || defaultBaseUrl(environment),
    email: global.email || stringValue(input.email) || stringValue(existing?.email),
    username: stringValue(input.username) || stringValue(existing?.username),
    password_secret: secretValue(input, 'password', existing?.password_secret),
    client_id: global.clientId || stringValue(input.clientId) || stringValue(existing?.client_id),
    client_secret: global.clientSecret || secretValue(input, 'clientSecret', existing?.client_secret),
    gstin: cleanGstin(input.gstin) || stringValue(existing?.gstin),
    ip_address: global.ipAddress || stringValue(input.ipAddress) || stringValue(existing?.ip_address) || '0.0.0.0',
    is_enabled: 1,
  }
}

function toGlobalSettingsRecord(row: Record<string, unknown>): GstProviderGlobalSettingsRecord {
  const environment = environmentValue(row.environment)
  return {
    id: String(row.id),
    uuid: String(row.uuid),
    provider: providerValue(row.provider),
    environment,
    purpose: purposeValue(row.purpose),
    baseUrl: stringValue(row.base_url) || defaultBaseUrl(environment),
    email: stringValue(row.email),
    clientId: stringValue(row.client_id),
    clientSecret: stringValue(row.client_secret),
    ipAddress: stringValue(row.ip_address) || '0.0.0.0',
    isEnabled: booleanValue(row.is_enabled),
    createdAt: toDate(row.created_at),
    updatedAt: toDate(row.updated_at),
  }
}

function envGlobalSettingsRecord(environment: GstProviderEnvironment = gspConfig.environment, purpose: GstProviderPurpose = 'einvoice_eway'): GstProviderGlobalSettingsRecord {
  return {
    id: '0',
    uuid: 'ENV',
    provider: 'whitebooks',
    environment,
    purpose,
    baseUrl: envBaseUrl(environment),
    email: '',
    clientId: '',
    clientSecret: '',
    ipAddress: '0.0.0.0',
    isEnabled: false,
    createdAt: new Date(0),
    updatedAt: new Date(0),
  }
}

function mergeSettingsRecord(settings: GstProviderSettingsRecord, global: GstProviderGlobalSettingsRecord): GstProviderSettingsRecord {
  return {
    ...settings,
    purpose: global.purpose,
    baseUrl: global.baseUrl || settings.baseUrl,
    email: global.email || settings.email,
    clientId: global.clientId || settings.clientId,
    clientSecret: global.clientSecret || settings.clientSecret,
    hasClientSecret: Boolean(global.clientSecret || settings.clientSecret),
    ipAddress: global.ipAddress || settings.ipAddress,
    isEnabled: Boolean(global.isEnabled && settings.isEnabled),
  }
}

function mergeSettingsSecretRecord(settings: GstProviderSettingsSecretRecord, global: GstProviderGlobalSettingsRecord): GstProviderSettingsSecretRecord {
  return {
    ...mergeSettingsRecord(settings, global),
    password: settings.password,
    clientSecret: global.clientSecret || settings.clientSecret,
  }
}

function toSettingsRecord(row: Record<string, unknown>): GstProviderSettingsRecord {
  return {
    id: String(row.id),
    uuid: String(row.uuid),
    companyId: String(row.company_id),
    provider: providerValue(row.provider),
    environment: environmentValue(row.environment),
    purpose: 'einvoice_eway',
    baseUrl: stringValue(row.base_url) || defaultBaseUrl(environmentValue(row.environment)),
    email: stringValue(row.email),
    username: stringValue(row.username),
    hasPassword: Boolean(stringValue(row.password_secret)),
    password: stringValue(row.password_secret),
    clientId: stringValue(row.client_id),
    hasClientSecret: Boolean(stringValue(row.client_secret)),
    clientSecret: stringValue(row.client_secret),
    gstin: stringValue(row.gstin),
    ipAddress: stringValue(row.ip_address) || '0.0.0.0',
    isEnabled: booleanValue(row.is_enabled),
    createdAt: toDate(row.created_at),
    updatedAt: toDate(row.updated_at),
  }
}

function toSettingsSecretRecord(row: Record<string, unknown>): GstProviderSettingsSecretRecord {
  return {
    ...toSettingsRecord(row),
    password: stringValue(row.password_secret),
    clientSecret: stringValue(row.client_secret),
  }
}

function emptySettingsRecord(companyId: number, environment: GstProviderEnvironment = 'sandbox'): GstProviderSettingsRecord {
  return {
    id: '',
    uuid: '',
    companyId: String(companyId),
    provider: 'whitebooks',
    environment,
    purpose: 'einvoice_eway',
    baseUrl: defaultBaseUrl(environment),
    email: '',
    username: '',
    hasPassword: false,
    password: '',
    clientId: '',
    hasClientSecret: false,
    clientSecret: '',
    gstin: '',
    ipAddress: '0.0.0.0',
    isEnabled: false,
    createdAt: new Date(0),
    updatedAt: new Date(0),
  }
}

function toOperationRecord(row: Record<string, unknown>): GstComplianceOperationRecord {
  return {
    id: String(row.id),
    uuid: String(row.uuid),
    settingId: stringOrNull(row.setting_id),
    companyId: String(row.company_id),
    provider: providerValue(row.provider),
    environment: environmentValue(row.environment),
    operation: String(row.operation) as GstComplianceOperation,
    sourceType: stringOrNull(row.source_type),
    sourceId: numberOrNull(row.source_id),
    sourceUuid: stringOrNull(row.source_uuid),
    documentNo: stringOrNull(row.document_no),
    method: stringValue(row.method),
    endpoint: stringValue(row.endpoint),
    httpStatus: numberOrNull(row.http_status),
    providerStatus: stringOrNull(row.provider_status),
    gatewayStatus: stringOrNull(row.gateway_status),
    success: booleanValue(row.success),
    errorCode: stringOrNull(row.error_code),
    errorMessage: stringOrNull(row.error_message),
    retryState: stringValue(row.retry_state) || 'none',
    retryCount: numberValue(row.retry_count),
    nextRetryAt: toDateOrNull(row.next_retry_at),
    generatedAt: toDateOrNull(row.generated_at),
    cancelledAt: toDateOrNull(row.cancelled_at),
    requestJson: parseJson(row.request_json) as Record<string, unknown>,
    responseJson: parseJson(row.response_json),
    createdBy: stringValue(row.created_by),
    createdAt: toDate(row.created_at),
  }
}

function toDocumentRecord(row: Record<string, unknown>): GstComplianceDocumentRecord {
  return {
    id: String(row.id),
    uuid: String(row.uuid),
    companyId: String(row.company_id),
    provider: providerValue(row.provider),
    environment: environmentValue(row.environment),
    sourceType: stringValue(row.source_type),
    sourceId: numberOrNull(row.source_id),
    sourceUuid: stringOrNull(row.source_uuid),
    documentType: stringValue(row.document_type),
    documentNo: stringValue(row.document_no),
    documentDate: stringOrNull(row.document_date),
    gstin: stringOrNull(row.gstin),
    irn: stringOrNull(row.irn),
    ackNo: stringOrNull(row.ack_no),
    ackDate: stringOrNull(row.ack_date),
    signedInvoice: stringOrNull(row.signed_invoice),
    signedQr: stringOrNull(row.signed_qr),
    ewayBillNo: stringOrNull(row.eway_bill_no),
    ewayBillDate: stringOrNull(row.eway_bill_date),
    ewayValidUpto: stringOrNull(row.eway_valid_upto),
    irnStatus: stringValue(row.irn_status),
    ewayStatus: stringValue(row.eway_status),
    irnGeneratedAt: stringOrNull(row.irn_generated_at),
    irnCancelledAt: stringOrNull(row.irn_cancelled_at),
    ewayGeneratedAt: stringOrNull(row.eway_generated_at),
    ewayCancelledAt: stringOrNull(row.eway_cancelled_at),
    retryState: stringValue(row.retry_state) || 'none',
    lastOperationId: stringOrNull(row.last_operation_id),
    updatedAt: toDate(row.updated_at),
  }
}

function documentPatch(operation: GstComplianceOperation, response: unknown) {
  if (operation === 'cancelIrn') return { irn_status: 'cancelled', irn_cancelled_at: new Date(), retry_state: 'none' }
  if (operation === 'cancelEwaybill') return { eway_status: 'cancelled', eway_cancelled_at: new Date(), retry_state: 'none' }
  if (operation === 'generateEwaybillByIrn' || operation === 'getEwaybillByIrn') {
    const ewayNo = findString(response, ['EwbNo', 'ewayBillNo', 'EWayBillNo'])
    return {
      eway_bill_no: ewayNo,
      eway_bill_date: parseProviderDate(findString(response, ['EwbDt', 'ewayBillDate', 'EWayBillDate'])),
      eway_valid_upto: parseProviderDate(findString(response, ['EwbValidTill', 'ValidUpto', 'validUpto'])),
      eway_status: ewayNo ? 'generated' : 'not_generated',
      eway_generated_at: ewayNo ? new Date() : null,
      retry_state: 'none',
    }
  }
  const irn = findString(response, ['Irn', 'IRN', 'irn'])
  return {
    irn,
    ack_no: findString(response, ['AckNo', 'ackNo', 'AckNum']),
    ack_date: parseProviderDate(findString(response, ['AckDt', 'AckDate', 'ackDate'])),
    signed_invoice: findString(response, ['SignedInvoice', 'signedInvoice']),
    signed_qr: findString(response, ['SignedQRCode', 'SignedQrCode', 'signedQr']),
    irn_status: irn ? 'generated' : 'not_generated',
    irn_generated_at: irn ? new Date() : null,
    retry_state: 'none',
  }
}

function generatedAt(operation: GstComplianceOperation, success: boolean) {
  return success && (operation === 'generateIrn' || operation === 'generateEwaybillByIrn') ? new Date() : null
}

function cancelledAt(operation: GstComplianceOperation, success: boolean) {
  return success && (operation === 'cancelIrn' || operation === 'cancelEwaybill') ? new Date() : null
}

function documentTypeFromSource(sourceType: string) {
  if (sourceType.toLowerCase().includes('credit')) return 'CRN'
  if (sourceType.toLowerCase().includes('debit')) return 'DBN'
  return 'INV'
}

function findString(value: unknown, keys: readonly string[]): string {
  if (!value || typeof value !== 'object') return ''
  const record = value as Record<string, unknown>
  for (const key of keys) {
    const direct = stringValue(record[key])
    if (direct) return direct
  }
  for (const nested of Object.values(record)) {
    const found = findString(nested, keys)
    if (found) return found
  }
  return ''
}

function parseProviderDate(value: string) {
  if (!value) return null
  const timestamp = value.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})$/)
  if (timestamp) {
    const [, year, month, day, hour, minute, second] = timestamp
    return new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), Number(second))
  }
  const normalized = value.includes('/') ? value.split('/').reverse().join('-') : value
  const date = new Date(normalized)
  return Number.isNaN(date.getTime()) ? value : date
}

function parseTokenExpiry(value: string) {
  const parsed = parseProviderDate(value)
  if (parsed instanceof Date) return parsed
  return new Date(Date.now() + 6 * 60 * 60 * 1000)
}

function secretValue(input: GstProviderSettingsInput, key: 'clientSecret' | 'password', existing: unknown) {
  if (Object.prototype.hasOwnProperty.call(input, key)) return stringValue(input[key])
  return stringValue(existing)
}

function providerValue(value: unknown): GstProvider {
  return value === 'whitebooks' ? 'whitebooks' : 'whitebooks'
}

function environmentValue(value: unknown): GstProviderEnvironment {
  return value === 'production' ? 'production' : 'sandbox'
}

function purposeValue(value: unknown): GstProviderPurpose {
  return value === 'eway_only' ? 'eway_only' : 'einvoice_eway'
}

function cleanGstin(value: unknown) {
  return stringValue(value).toUpperCase()
}

function cleanUrl(value: unknown) {
  return stringValue(value).replace(/\/+$/, '')
}

function defaultBaseUrl(environment: GstProviderEnvironment) {
  return environment === 'production' ? whiteBooksProductionBaseUrl : whiteBooksSandboxBaseUrl
}

function envBaseUrl(environment: GstProviderEnvironment) {
  return environment === 'production' ? gspConfig.productionBaseUrl : gspConfig.sandboxBaseUrl
}

function nowSqlString() {
  return new Date().toISOString().slice(0, 19).replace('T', ' ')
}

function tokenPreview(value: unknown) {
  const token = stringValue(value)
  if (!token) return null
  return `...${token.slice(-6)}`
}

function stringValue(value: unknown) {
  return typeof value === 'string' ? value.trim() : value === null || value === undefined ? '' : String(value).trim()
}

function stringOrNull(value: unknown) {
  const text = stringValue(value)
  return text || null
}

function numberOrNull(value: unknown) {
  const number = Number(value)
  return Number.isInteger(number) && number > 0 ? number : null
}

function numberValue(value: unknown) {
  const number = Number(value)
  return Number.isFinite(number) ? number : 0
}

function booleanValue(value: unknown) {
  return value === true || value === 1 || value === '1'
}

function parseJson(value: unknown): unknown {
  if (typeof value !== 'string') return {}
  try {
    return JSON.parse(value) as unknown
  } catch {
    return {}
  }
}

function redactStoredSecretResponse(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redactStoredSecretResponse)
  if (!value || typeof value !== 'object') return value
  return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, entry]) => [
    key,
    ['authtoken', 'auth-token', 'client_id', 'clientid', 'clientsecret', 'client_secret', 'password', 'sek', 'token'].includes(key.toLowerCase()) ? '***' : redactStoredSecretResponse(entry),
  ]))
}

function toDate(value: unknown) {
  return value instanceof Date ? value : new Date(String(value))
}

function toDateOrNull(value: unknown) {
  if (!value) return null
  const date = toDate(value)
  return Number.isNaN(date.getTime()) ? null : date
}
