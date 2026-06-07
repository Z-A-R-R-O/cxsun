import { BadRequestException } from '../../core/exceptions/http.exception.js'
import { Inject } from '../../core/decorators/inject.js'
import { Injectable } from '../../core/decorators/injectable.js'
import { TenantContextService, type TenantRequestHeaders, type TenantRuntimeContext } from '../../core/tenant/tenant-context.service.js'
import { MasterQueueService } from '../../infrastructure/queue/master-queue.service.js'
import { ContactMasterRepository } from '../master/contact/infrastructure/persistence/contact-master.repository.js'
import { ProductMasterRepository } from '../master/product/infrastructure/persistence/product-master.repository.js'
import { SalesEntryRepository } from '../entries/sales/infrastructure/persistence/sales-entry.repository.js'
import { PurchaseEntryRepository } from '../entries/purchase/infrastructure/persistence/purchase-entry.repository.js'
import { TallyRepository } from './tally.repository.js'
import type {
  TallyConnectionValidation,
  TallyContactSyncRow,
  TallyEntrySyncRow,
  TallyProductSyncRow,
  TallySettings,
  TallySettingsInput,
  TallySyncActionInput,
  TallySyncJobInput,
  TallySyncLink,
  TallySyncListResponse,
  TallySyncQuery,
  TallySyncResource,
} from './tally.types.js'

type AnyRow = Record<string, any>

@Injectable()
export class TallyService {
  constructor(
    @Inject(TenantContextService) private readonly tenants: TenantContextService,
    @Inject(TallyRepository) private readonly tally: TallyRepository,
    @Inject(MasterQueueService) private readonly queue: MasterQueueService,
    @Inject(ContactMasterRepository) private readonly contacts: ContactMasterRepository,
    @Inject(ProductMasterRepository) private readonly products: ProductMasterRepository,
    @Inject(SalesEntryRepository) private readonly salesEntries: SalesEntryRepository,
    @Inject(PurchaseEntryRepository) private readonly purchaseEntries: PurchaseEntryRepository,
  ) {}

  async workspace(headers: TenantRequestHeaders) {
    const context = await this.tenants.resolve(headers, 'company.manage')
    return this.tally.workspace(context)
  }

  async saveSettings(headers: TenantRequestHeaders, input: TallySettingsInput) {
    const context = await this.tenants.resolve(headers, 'company.manage')
    const settings = await this.tally.saveSettings(context, input ?? {})
    return { ok: true, settings, workspace: await this.tally.workspace(context) }
  }

  async validateConnection(headers: TenantRequestHeaders, input: TallySettingsInput) {
    const context = await this.tenants.resolve(headers, 'company.manage')
    const savedSettings = await this.tally.saveSettings(context, input ?? {})
    if (!savedSettings.company_name) {
      const validation: TallyConnectionValidation = {
        ok: false,
        endpoint: tallyEndpoint(savedSettings.tally_host, savedSettings.tally_port),
        requested_company: '',
        matched_company: null,
        available_companies: [],
        checked_at: new Date().toISOString(),
        http_status: null,
        status: null,
        line_error: null,
        detail: 'Tally company name is required before validating the handshake.',
        response_excerpt: null,
      }
      const settings = await this.tally.saveSettings(context, {
        enabled: false,
        settings: {
          mode: 'single-operation',
          handshake: validation,
        },
      })
      return {
        ok: false,
        validation,
        settings,
        workspace: await this.tally.workspace(context),
      }
    }

    const validation = await validateTallyConnection(savedSettings)
    const settings = await this.tally.saveSettings(context, {
      enabled: validation.ok,
      settings: {
        mode: 'single-operation',
        handshake: validation,
      },
    })

    return {
      ok: validation.ok,
      validation,
      settings,
      workspace: await this.tally.workspace(context),
    }
  }

  async createJob(headers: TenantRequestHeaders, input: TallySyncJobInput) {
    const context = await this.tenants.resolve(headers, 'company.manage')
    const workspace = await this.tally.createJob(context, input ?? {})
    await this.queue.enqueue({
      type: 'tally.sync.requested',
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

  async syncList(headers: TenantRequestHeaders, resourceValue: string, rawQuery: Record<string, unknown>) {
    const context = await this.tenants.resolve(headers, 'company.manage')
    const resource = assertSyncResource(resourceValue)
    const query = normalizeSyncQuery(rawQuery)

    if (resource === 'contacts') return this.contactSyncList(context, query)
    if (resource === 'products') return this.productSyncList(context, query)
    if (resource === 'sales') return this.salesSyncList(context, query)
    return this.purchaseSyncList(context, query)
  }

  async syncRecords(headers: TenantRequestHeaders, resourceValue: string, input: TallySyncActionInput) {
    const context = await this.tenants.resolve(headers, 'company.manage')
    const resource = assertSyncResource(resourceValue)
    const ids = uniqueStrings(input?.ids ?? [])

    if (!ids.length) {
      throw new BadRequestException('Select at least one record to sync.')
    }

    if (resource === 'contacts') return this.syncContacts(context, ids)
    if (resource === 'products') return this.syncProducts(context, ids)
    if (resource === 'sales') return this.queueSales(context, ids)
    return this.queuePurchase(context, ids)
  }

  private async contactSyncList(
    context: TenantRuntimeContext,
    query: TallySyncQuery,
  ): Promise<TallySyncListResponse<TallyContactSyncRow>> {
    const records = (await this.contacts.list(context)) as AnyRow[]
    const links = await this.linkMap(context, ['contacts'])
    const lookups = await commonLookups(context)
    const rows = records.map((record) => {
      const classification = contactClassification(record)
      const link = links.get(`contacts:${String(record.uuid)}`)
      return toContactSyncRow(record, link, classification, lookups)
    })

    return { resource: 'contacts', rows: filterContactRows(rows, query) }
  }

  private async productSyncList(
    context: TenantRuntimeContext,
    query: TallySyncQuery,
  ): Promise<TallySyncListResponse<TallyProductSyncRow>> {
    const records = (await this.products.list(context)) as AnyRow[]
    const links = await this.linkMap(context, ['products'])
    const lookups = await commonLookups(context)
    const rows = records.map((record) => {
      const link = links.get(`products:${String(record.uuid)}`)
      return toProductSyncRow(record, link, lookups)
    })

    return { resource: 'products', rows: filterProductRows(rows, query) }
  }

  private async salesSyncList(
    context: TenantRuntimeContext,
    query: TallySyncQuery,
  ): Promise<TallySyncListResponse<TallyEntrySyncRow>> {
    const entries = (await this.salesEntries.list(context)) as AnyRow[]
    const links = await this.linkMap(context, ['contacts', 'products', 'sales'])
    const rows = entries.map((entry) => toSalesSyncRow(entry, links))
    return { resource: 'sales', rows: filterEntryRows(rows, query) }
  }

  private async purchaseSyncList(
    context: TenantRuntimeContext,
    query: TallySyncQuery,
  ): Promise<TallySyncListResponse<TallyEntrySyncRow>> {
    const entries = (await this.purchaseEntries.list(context)) as AnyRow[]
    const links = await this.linkMap(context, ['contacts', 'products', 'purchase'])
    const rows = entries.map((entry) => toPurchaseSyncRow(entry, links))
    return { resource: 'purchase', rows: filterEntryRows(rows, query) }
  }

  private async syncContacts(context: TenantRuntimeContext, ids: string[]) {
    const settings = await this.requireValidatedSettings(context)
    const lookups = await commonLookups(context)
    const records = ((await this.contacts.list(context)) as AnyRow[]).filter((record) => ids.includes(String(record.uuid)))
    const summary = { failed: 0, synced: 0 }

    for (const record of records) {
      const classification = contactClassification(record)
      const label = contactDisplayName(record)
      if (!classification.groupName) {
        summary.failed += 1
        await this.tally.saveSyncLink(context, {
          module_key: 'contacts',
          record_type: 'master',
          record_id: valueOrNull(record.id),
          record_uuid: String(record.uuid),
          record_label: label,
          classification: classification.type,
          status: 'failed',
          last_error: 'Only customer and supplier contacts can be pushed to Tally.',
          payload: { classification: classification.type },
        })
        continue
      }

      const result = await syncContactToTally(settings, record, classification.groupName, lookups)
      await this.tally.saveSyncLink(context, {
        module_key: 'contacts',
        record_type: 'master',
        record_id: valueOrNull(record.id),
        record_uuid: String(record.uuid),
        record_label: label,
        classification: classification.type,
        tally_name: result.tallyName,
        tally_guid: result.tallyGuid,
        status: result.ok ? 'synced' : 'failed',
        last_synced_at: result.ok ? new Date() : null,
        last_error: result.ok ? null : result.error,
        payload: result.payload,
      })
      if (result.ok) summary.synced += 1
      else summary.failed += 1
    }

    return { ok: summary.failed === 0, summary }
  }

  private async syncProducts(context: TenantRuntimeContext, ids: string[]) {
    const settings = await this.requireValidatedSettings(context)
    const lookups = await commonLookups(context)
    const records = ((await this.products.list(context)) as AnyRow[]).filter((record) => ids.includes(String(record.uuid)))
    const summary = { failed: 0, synced: 0 }

    for (const record of records) {
      const result = await syncProductToTally(settings, record, lookups)
      await this.tally.saveSyncLink(context, {
        module_key: 'products',
        record_type: 'master',
        record_id: valueOrNull(record.id),
        record_uuid: String(record.uuid),
        record_label: productDisplayName(record),
        classification: null,
        tally_name: result.tallyName,
        tally_guid: result.tallyGuid,
        status: result.ok ? 'synced' : 'failed',
        last_synced_at: result.ok ? new Date() : null,
        last_error: result.ok ? null : result.error,
        payload: result.payload,
      })
      if (result.ok) summary.synced += 1
      else summary.failed += 1
    }

    return { ok: summary.failed === 0, summary }
  }

  private async queueSales(context: TenantRuntimeContext, ids: string[]) {
    await this.requireValidatedSettings(context)
    const links = await this.linkMap(context, ['contacts', 'products', 'sales'])
    const entries = ((await this.salesEntries.list(context)) as AnyRow[]).filter((entry) => ids.includes(String(entry.uuid)))
    const summary = { failed: 0, queued: 0 }

    for (const entry of entries) {
      const row = toSalesSyncRow(entry, links)
      if (row.missing_masters.length) {
        summary.failed += 1
        await this.tally.saveSyncLink(context, {
          module_key: 'sales',
          record_type: 'entry',
          record_id: valueOrNull(entry.id),
          record_uuid: String(entry.uuid),
          record_label: String(entry.invoice_no ?? ''),
          status: 'failed',
          last_error: `Missing synced masters: ${row.missing_masters.join(', ')}`,
          payload: { missing_masters: row.missing_masters },
        })
        continue
      }

      await this.tally.createJob(context, {
        job_type: 'sales-entry-sync',
        direction: 'export',
        payload: {
          mode: 'single-operation',
          operation: 'export-sales-entry',
          resource: 'sales',
          record_uuid: entry.uuid,
          record_label: entry.invoice_no,
          dependencies: {
            customer_uuid: entry.customer_id ?? null,
            product_uuids: uniqueStrings((entry.items ?? []).map((item: AnyRow) => valueOrNull(item.product_id))),
          },
        },
      })
      await this.queue.enqueue({
        type: 'tally.sync.requested',
        payload: { tenantId: context.tenant.id, requestedBy: context.user.email, jobType: 'sales-entry-sync', recordUuid: entry.uuid },
      })
      await this.tally.saveSyncLink(context, {
        module_key: 'sales',
        record_type: 'entry',
        record_id: valueOrNull(entry.id),
        record_uuid: String(entry.uuid),
        record_label: String(entry.invoice_no ?? ''),
        status: 'queued',
        last_synced_at: null,
        last_error: null,
        payload: { mode: 'single-operation', operation: 'export-sales-entry' },
      })
      summary.queued += 1
    }

    return { ok: summary.failed === 0, summary }
  }

  private async queuePurchase(context: TenantRuntimeContext, ids: string[]) {
    await this.requireValidatedSettings(context)
    const links = await this.linkMap(context, ['contacts', 'products', 'purchase'])
    const entries = ((await this.purchaseEntries.list(context)) as AnyRow[]).filter((entry) => ids.includes(String(entry.uuid)))
    const summary = { failed: 0, queued: 0 }

    for (const entry of entries) {
      const row = toPurchaseSyncRow(entry, links)
      if (row.missing_masters.length) {
        summary.failed += 1
        await this.tally.saveSyncLink(context, {
          module_key: 'purchase',
          record_type: 'entry',
          record_id: valueOrNull(entry.id),
          record_uuid: String(entry.uuid),
          record_label: String(entry.entry_no ?? ''),
          status: 'failed',
          last_error: `Missing synced masters: ${row.missing_masters.join(', ')}`,
          payload: { missing_masters: row.missing_masters },
        })
        continue
      }

      await this.tally.createJob(context, {
        job_type: 'purchase-entry-sync',
        direction: 'export',
        payload: {
          mode: 'single-operation',
          operation: 'export-purchase-entry',
          resource: 'purchase',
          record_uuid: entry.uuid,
          record_label: entry.entry_no,
          dependencies: {
            supplier_uuid: entry.supplier_id ?? null,
            product_uuids: uniqueStrings((entry.items ?? []).map((item: AnyRow) => valueOrNull(item.product_id))),
          },
        },
      })
      await this.queue.enqueue({
        type: 'tally.sync.requested',
        payload: { tenantId: context.tenant.id, requestedBy: context.user.email, jobType: 'purchase-entry-sync', recordUuid: entry.uuid },
      })
      await this.tally.saveSyncLink(context, {
        module_key: 'purchase',
        record_type: 'entry',
        record_id: valueOrNull(entry.id),
        record_uuid: String(entry.uuid),
        record_label: String(entry.entry_no ?? ''),
        status: 'queued',
        last_synced_at: null,
        last_error: null,
        payload: { mode: 'single-operation', operation: 'export-purchase-entry' },
      })
      summary.queued += 1
    }

    return { ok: summary.failed === 0, summary }
  }

  private async requireValidatedSettings(context: TenantRuntimeContext) {
    const settings = await this.tally.settings(context)
    const validation = readHandshake(settings.settings)
    if (!settings.enabled || !validation?.ok || !settings.company_name) {
      throw new BadRequestException('Validate the Tally handshake before syncing records.')
    }
    return settings
  }

  private async linkMap(context: TenantRuntimeContext, moduleKeys: string[]) {
    const links = await this.tally.syncLinks(context, moduleKeys)
    return new Map(links.map((link) => [`${link.module_key}:${link.record_uuid}`, link]))
  }
}

async function validateTallyConnection(settings: TallySettings): Promise<TallyConnectionValidation> {
  const endpoint = tallyEndpoint(settings.tally_host, settings.tally_port)
  const checkedAt = new Date().toISOString()
  const requestedCompany = settings.company_name?.trim() ?? ''

  try {
    const companiesResponse = await postTallyXml(endpoint, tallyCompaniesEnvelope())
    const availableCompanies = extractCompanyNames(companiesResponse.xml)
    const matchedCompany = availableCompanies.find((company) => normalizeText(company) === normalizeText(requestedCompany)) ?? null
    if (!matchedCompany) {
      return {
        ok: false,
        endpoint,
        requested_company: requestedCompany,
        matched_company: null,
        available_companies: availableCompanies,
        checked_at: checkedAt,
        http_status: companiesResponse.httpStatus,
        status: captureXmlTag(companiesResponse.xml, 'STATUS'),
        line_error: null,
        detail: availableCompanies.length
          ? `Tally company "${requestedCompany}" was not found. Available companies: ${availableCompanies.join(', ')}.`
          : `Tally responded, but no companies were returned for "${requestedCompany}".`,
        response_excerpt: compactExcerpt(companiesResponse.xml),
      }
    }

    const response = await postTallyXml(endpoint, tallyCompanyObjectEnvelope(matchedCompany))
    const status = captureXmlTag(response.xml, 'STATUS')
    const lineError = captureXmlTag(response.xml, 'LINEERROR') || captureXmlTag(response.xml, 'ERRORMSG')
    const returnedCompany = captureCompanyObjectName(response.xml)
    const ok = response.ok && !lineError && normalizeText(returnedCompany) === normalizeText(matchedCompany)
    return {
      ok,
      endpoint,
      requested_company: requestedCompany,
      matched_company: returnedCompany,
      available_companies: availableCompanies,
      checked_at: checkedAt,
      http_status: response.httpStatus,
      status,
      line_error: lineError,
      detail: ok
        ? `Connection established with ${returnedCompany}.`
        : lineError || `Tally responded, but the selected company "${matchedCompany}" was not returned as an exact company object.`,
      response_excerpt: compactExcerpt(response.xml),
    }
  } catch (error) {
    return {
      ok: false,
      endpoint,
      requested_company: requestedCompany,
      matched_company: null,
      available_companies: [],
      checked_at: checkedAt,
      http_status: null,
      status: null,
      line_error: null,
      detail: error instanceof Error ? error.message : 'Tally connection failed.',
      response_excerpt: null,
    }
  }
}

async function syncContactToTally(
  settings: TallySettings,
  record: AnyRow,
  groupName: string,
  lookups: CommonLookups,
) {
  const endpoint = tallyEndpoint(settings.tally_host, settings.tally_port)
  const companyName = settings.company_name?.trim() ?? ''
  const name = contactDisplayName(record)
  const address = contactAddress(record, lookups)
  const objectBefore = await fetchTallyObjectByName(endpoint, companyName, 'Ledger', name, ['Name', 'MasterID', 'Parent'])
  const action = objectBefore.found ? 'Alter' : 'Create'
  const importResponse = await postTallyXml(endpoint, tallyImportEnvelope(companyName, ledgerImportMessage(record, name, groupName, address, action)))
  const importError = tallyImportError(importResponse.xml)
  if (importError) {
    return { ok: false, error: importError, payload: compactExcerpt(importResponse.xml), tallyGuid: null, tallyName: name }
  }

  const objectAfter = await fetchTallyObjectByName(endpoint, companyName, 'Ledger', name, ['Name', 'MasterID', 'Parent', 'PARTYGSTIN'])
  if (!objectAfter.found) {
    const lookupError = captureXmlTag(objectAfter.xml, 'ERRORMSG') || captureXmlTag(objectAfter.xml, 'LINEERROR')
    return {
      ok: false,
      error: lookupError || `Tally imported the ledger request, but did not return "${name}" in post-import verification.`,
      payload: {
        import_response: compactExcerpt(importResponse.xml),
        verification_response: compactExcerpt(objectAfter.xml),
      },
      tallyGuid: null,
      tallyName: name,
    }
  }

  return {
    ok: true,
    error: null,
    payload: compactExcerpt(importResponse.xml),
    tallyGuid: objectAfter.masterId,
    tallyName: objectAfter.name,
  }
}

async function syncProductToTally(settings: TallySettings, record: AnyRow, lookups: CommonLookups) {
  const endpoint = tallyEndpoint(settings.tally_host, settings.tally_port)
  const companyName = settings.company_name?.trim() ?? ''
  const name = productDisplayName(record)
  const unitName = productUnitLabel(record, lookups) || 'Nos'
  await postTallyXml(endpoint, tallyImportEnvelope(companyName, unitImportMessage(unitName)))
  const objectBefore = await fetchTallyObjectByName(endpoint, companyName, 'Stock Item', name, ['Name', 'MasterID', 'BaseUnits'])
  const action = objectBefore.found ? 'Alter' : 'Create'
  const importResponse = await postTallyXml(endpoint, tallyImportEnvelope(companyName, stockItemImportMessage(record, name, unitName, lookups, action)))
  const importError = tallyImportError(importResponse.xml)
  if (importError) {
    return { ok: false, error: importError, payload: compactExcerpt(importResponse.xml), tallyGuid: null, tallyName: name }
  }

  const objectAfter = await fetchTallyObjectByName(endpoint, companyName, 'Stock Item', name, ['Name', 'MasterID', 'BaseUnits'])
  if (!objectAfter.found) {
    const lookupError = captureXmlTag(objectAfter.xml, 'ERRORMSG') || captureXmlTag(objectAfter.xml, 'LINEERROR')
    return {
      ok: false,
      error: lookupError || `Tally imported the stock item request, but did not return "${name}" in post-import verification.`,
      payload: {
        import_response: compactExcerpt(importResponse.xml),
        verification_response: compactExcerpt(objectAfter.xml),
      },
      tallyGuid: null,
      tallyName: name,
    }
  }

  return {
    ok: true,
    error: null,
    payload: compactExcerpt(importResponse.xml),
    tallyGuid: objectAfter.masterId,
    tallyName: objectAfter.name,
  }
}

async function fetchTallyObjectByName(endpoint: string, companyName: string, subtype: string, objectName: string, fields: string[]) {
  const response = await postTallyXml(endpoint, tallyNamedObjectEnvelope(companyName, subtype, objectName, fields))
  const lineError = captureXmlTag(response.xml, 'LINEERROR') || captureXmlTag(response.xml, 'ERRORMSG')
  return {
    found: response.ok && !lineError && normalizeText(captureObjectName(response.xml)) === normalizeText(objectName),
    masterId: captureXmlTag(response.xml, 'MASTERID'),
    name: captureObjectName(response.xml),
    xml: response.xml,
  }
}

async function commonLookups(context: TenantRuntimeContext) {
  const names = await Promise.all([
    buildLookupMap(context, 'common_states', (row) => String(row.name ?? row.code ?? '')),
    buildLookupMap(context, 'common_countries', (row) => String(row.name ?? row.code ?? '')),
    buildLookupMap(context, 'common_cities', (row) => String(row.name ?? row.code ?? '')),
    buildLookupMap(context, 'common_districts', (row) => String(row.name ?? row.code ?? '')),
    buildLookupMap(context, 'common_pincodes', (row) => String(row.name ?? row.code ?? '')),
    buildLookupMap(context, 'common_units', (row) => String(row.symbol ?? row.name ?? row.code ?? '')),
    buildLookupMap(context, 'common_hsn_codes', (row) => String(row.code ?? row.name ?? '')),
    buildLookupMap(context, 'common_taxes', (row) => {
      const rate = Number(row.rate_percent ?? 0)
      return Number.isFinite(rate) ? `${rate}%` : String(row.name ?? row.code ?? '')
    }),
    buildLookupMap(context, 'common_product_types', (row) => String(row.name ?? row.code ?? '')),
  ])

  return {
    states: names[0],
    countries: names[1],
    cities: names[2],
    districts: names[3],
    pincodes: names[4],
    units: names[5],
    hsnCodes: names[6],
    taxes: names[7],
    productTypes: names[8],
  }
}

interface CommonLookups {
  states: Map<string, string>
  countries: Map<string, string>
  cities: Map<string, string>
  districts: Map<string, string>
  pincodes: Map<string, string>
  units: Map<string, string>
  hsnCodes: Map<string, string>
  taxes: Map<string, string>
  productTypes: Map<string, string>
}

async function buildLookupMap(context: TenantRuntimeContext, tableName: string, label: (row: AnyRow) => string) {
  const rows = await (context.database as any).selectFrom(tableName).selectAll().execute() as AnyRow[]
  const map = new Map<string, string>()
  for (const row of rows) {
    const value = label(row).trim()
    if (!value) continue
    for (const key of [row.id, row.uuid, row.code, row.name, row.symbol]) {
      if (key !== null && key !== undefined && key !== '') {
        map.set(String(key), value)
      }
    }
  }
  return map
}

function toContactSyncRow(record: AnyRow, link: TallySyncLink | undefined, classification: ContactClassification, lookups: CommonLookups): TallyContactSyncRow {
  const active = booleanValue(record.isActive ?? record.is_active, true)
  return {
    id: Number(record.id ?? 0),
    uuid: String(record.uuid),
    code: String(record.code ?? ''),
    name: String(record.name ?? ''),
    legal_name: stringOrNull(record.legalName ?? record.legal_name),
    contact_type: stringOrNull(record.contactTypeId ?? record.contact_type_id),
    ledger_name: stringOrNull(record.ledgerName ?? record.ledger_name),
    classification: classification.type,
    tally_group: classification.groupName,
    gstin: contactGstin(record),
    address: contactAddress(record, lookups).text,
    phone: stringOrNull(record.primaryPhone ?? record.primary_phone),
    email: stringOrNull(record.primaryEmail ?? record.primary_email),
    is_active: active,
    sync_status: !classification.groupName ? 'unsupported' : link?.status ?? 'not-synced',
    synced_to_tally: link?.status === 'synced',
    tally_name: link?.tally_name ?? null,
    tally_guid: link?.tally_guid ?? null,
    last_synced_at: dateString(link?.last_synced_at ?? null),
    last_error: link?.last_error ?? null,
  }
}

function toProductSyncRow(record: AnyRow, link: TallySyncLink | undefined, lookups: CommonLookups): TallyProductSyncRow {
  return {
    id: Number(record.id ?? 0),
    uuid: String(record.uuid),
    code: stringOrNull(record.code),
    name: productDisplayName(record),
    product_type: labelFrom(lookups.productTypes, record.product_type_id),
    hsn_code: labelFrom(lookups.hsnCodes, record.hsn_code_id),
    unit: productUnitLabel(record, lookups),
    tax_rate: labelFrom(lookups.taxes, record.tax_id),
    is_active: booleanValue(record.is_active, true),
    sync_status: link?.status ?? 'not-synced',
    synced_to_tally: link?.status === 'synced',
    tally_name: link?.tally_name ?? null,
    tally_guid: link?.tally_guid ?? null,
    last_synced_at: dateString(link?.last_synced_at ?? null),
    last_error: link?.last_error ?? null,
  }
}

function toSalesSyncRow(entry: AnyRow, links: Map<string, TallySyncLink>): TallyEntrySyncRow {
  const entryLink = links.get(`sales:${String(entry.uuid)}`)
  const missing = salesMissingMasters(entry, links)
  return {
    id: Number(entry.id ?? 0),
    uuid: String(entry.uuid),
    document_no: String(entry.invoice_no ?? ''),
    document_date: String(entry.invoice_date ?? ''),
    party_uuid: stringOrNull(entry.customer_id),
    party_name: String(entry.customer_name ?? ''),
    grand_total: Number(entry.grand_total ?? 0),
    item_count: Array.isArray(entry.items) ? entry.items.length : 0,
    is_active: booleanValue(entry.is_active, true),
    sync_status: entryLink?.status ?? (missing.length ? 'missing-masters' : 'ready'),
    synced_to_tally: entryLink?.status === 'synced',
    tally_name: entryLink?.tally_name ?? null,
    tally_guid: entryLink?.tally_guid ?? null,
    last_synced_at: dateString(entryLink?.last_synced_at ?? null),
    last_error: entryLink?.last_error ?? null,
    prerequisite_status: missing.length ? 'missing-masters' : 'ready',
    missing_masters: missing,
  }
}

function toPurchaseSyncRow(entry: AnyRow, links: Map<string, TallySyncLink>): TallyEntrySyncRow {
  const entryLink = links.get(`purchase:${String(entry.uuid)}`)
  const missing = purchaseMissingMasters(entry, links)
  return {
    id: Number(entry.id ?? 0),
    uuid: String(entry.uuid),
    document_no: String(entry.entry_no ?? ''),
    document_date: String(entry.entry_date ?? ''),
    party_uuid: stringOrNull(entry.supplier_id),
    party_name: String(entry.supplier_name ?? ''),
    grand_total: Number(entry.grand_total ?? 0),
    item_count: Array.isArray(entry.items) ? entry.items.length : 0,
    is_active: booleanValue(entry.is_active, true),
    sync_status: entryLink?.status ?? (missing.length ? 'missing-masters' : 'ready'),
    synced_to_tally: entryLink?.status === 'synced',
    tally_name: entryLink?.tally_name ?? null,
    tally_guid: entryLink?.tally_guid ?? null,
    last_synced_at: dateString(entryLink?.last_synced_at ?? null),
    last_error: entryLink?.last_error ?? null,
    prerequisite_status: missing.length ? 'missing-masters' : 'ready',
    missing_masters: missing,
  }
}

function salesMissingMasters(entry: AnyRow, links: Map<string, TallySyncLink>) {
  const missing: string[] = []
  if (!entry.customer_id) missing.push('Customer')
  else if (links.get(`contacts:${String(entry.customer_id)}`)?.status !== 'synced') missing.push(`Customer: ${String(entry.customer_name ?? '')}`)
  for (const item of Array.isArray(entry.items) ? entry.items : []) {
    if (!item.product_id) {
      missing.push(`Product: ${String(item.product_name ?? 'Item')}`)
      continue
    }
    if (links.get(`products:${String(item.product_id)}`)?.status !== 'synced') {
      missing.push(`Product: ${String(item.product_name ?? item.product_id)}`)
    }
  }
  return uniqueStrings(missing)
}

function purchaseMissingMasters(entry: AnyRow, links: Map<string, TallySyncLink>) {
  const missing: string[] = []
  if (!entry.supplier_id) missing.push('Supplier')
  else if (links.get(`contacts:${String(entry.supplier_id)}`)?.status !== 'synced') missing.push(`Supplier: ${String(entry.supplier_name ?? '')}`)
  for (const item of Array.isArray(entry.items) ? entry.items : []) {
    if (!item.product_id) {
      missing.push(`Product: ${String(item.product_name ?? 'Item')}`)
      continue
    }
    if (links.get(`products:${String(item.product_id)}`)?.status !== 'synced') {
      missing.push(`Product: ${String(item.product_name ?? item.product_id)}`)
    }
  }
  return uniqueStrings(missing)
}

interface ContactClassification {
  type: string
  groupName: string | null
}

function contactClassification(record: AnyRow): ContactClassification {
  const source = [record.contactTypeId, record.contact_type_id, record.ledgerId, record.ledger_id, record.ledgerName, record.ledger_name]
    .map((value) => String(value ?? '').toLowerCase())
    .join(' ')

  if (source.includes('supplier') || source.includes('creditor')) {
    return { type: 'supplier', groupName: 'Sundry Creditors' }
  }
  if (source.includes('customer') || source.includes('debitor') || source.includes('debtor')) {
    return { type: 'customer', groupName: 'Sundry Debtors' }
  }
  return { type: 'other', groupName: null }
}

function contactDisplayName(record: AnyRow) {
  return String(record.legalName ?? record.legal_name ?? record.name ?? record.code ?? 'Contact').trim()
}

function productDisplayName(record: AnyRow) {
  return String(record.name ?? record.code ?? record.uuid ?? 'Product').trim()
}

function productUnitLabel(record: AnyRow, lookups: CommonLookups) {
  return labelFrom(lookups.units, record.unit_id) || 'Nos'
}

function contactGstin(record: AnyRow) {
  const gstin = stringOrNull(record.gstin)
  if (gstin) return gstin
  if (Array.isArray(record.gstDetails)) {
    for (const detail of record.gstDetails) {
      const current = stringOrNull(detail?.gstin)
      if (current) return current
    }
  }
  return null
}

function contactAddress(record: AnyRow, lookups: CommonLookups) {
  const addresses = Array.isArray(record.addresses) ? record.addresses : []
  const selected = addresses.find((address) => booleanValue(address?.isDefault ?? address?.is_default)) ?? addresses[0] ?? null
  if (!selected) return { country: 'India', pincode: null, state: null, text: null }

  const parts = [
    stringOrNull(selected.addressLine1 ?? selected.address_line1),
    stringOrNull(selected.addressLine2 ?? selected.address_line2),
    labelFrom(lookups.cities, selected.cityId ?? selected.city_id),
    labelFrom(lookups.districts, selected.districtId ?? selected.district_id),
    labelFrom(lookups.states, selected.stateId ?? selected.state_id),
    labelFrom(lookups.pincodes, selected.pincodeId ?? selected.pincode_id),
    labelFrom(lookups.countries, selected.countryId ?? selected.country_id),
  ].filter(Boolean) as string[]

  return {
    text: parts.join(', '),
    state: labelFrom(lookups.states, selected.stateId ?? selected.state_id),
    country: labelFrom(lookups.countries, selected.countryId ?? selected.country_id) || 'India',
    pincode: labelFrom(lookups.pincodes, selected.pincodeId ?? selected.pincode_id),
  }
}

function normalizeSyncQuery(value: Record<string, unknown>): TallySyncQuery {
  return {
    search: stringOrNull(value.search) ?? undefined,
    status: stringOrNull(value.status) ?? undefined,
    classification: stringOrNull(value.classification) ?? undefined,
  }
}

function filterContactRows(rows: TallyContactSyncRow[], query: TallySyncQuery) {
  return rows.filter((row) => {
    if (query.classification && query.classification !== 'all' && row.classification !== query.classification) return false
    if (query.status && query.status !== 'all' && row.sync_status !== query.status) return false
    if (query.search) {
      const text = [row.code, row.name, row.legal_name, row.gstin, row.email, row.phone, row.address]
        .map((value) => String(value ?? '').toLowerCase())
        .join(' ')
      if (!text.includes(query.search.toLowerCase())) return false
    }
    return true
  })
}

function filterProductRows(rows: TallyProductSyncRow[], query: TallySyncQuery) {
  return rows.filter((row) => {
    if (query.status && query.status !== 'all' && row.sync_status !== query.status) return false
    if (query.search) {
      const text = [row.code, row.name, row.hsn_code, row.unit, row.tax_rate, row.product_type]
        .map((value) => String(value ?? '').toLowerCase())
        .join(' ')
      if (!text.includes(query.search.toLowerCase())) return false
    }
    return true
  })
}

function filterEntryRows(rows: TallyEntrySyncRow[], query: TallySyncQuery) {
  return rows.filter((row) => {
    if (query.status && query.status !== 'all' && row.sync_status !== query.status && row.prerequisite_status !== query.status) return false
    if (query.search) {
      const text = [row.document_no, row.party_name, row.document_date, ...row.missing_masters]
        .map((value) => String(value ?? '').toLowerCase())
        .join(' ')
      if (!text.includes(query.search.toLowerCase())) return false
    }
    return true
  })
}

function assertSyncResource(value: string): TallySyncResource {
  if (value === 'contacts' || value === 'products' || value === 'sales' || value === 'purchase') return value
  throw new BadRequestException(`Unsupported Tally sync resource: ${value}.`)
}

function readHandshake(value: string | null) {
  if (!value) return null
  try {
    const parsed = JSON.parse(value) as { handshake?: TallyConnectionValidation }
    return parsed?.handshake ?? null
  } catch {
    return null
  }
}

async function postTallyXml(endpoint: string, xml: string) {
  const response = await fetch(endpoint, {
    body: xml,
    headers: {
      Accept: 'application/xml, text/xml;q=0.9, */*;q=0.8',
      'Content-Type': 'text/xml; charset=utf-8',
    },
    method: 'POST',
    signal: AbortSignal.timeout(15_000),
  })
  return {
    ok: response.ok,
    httpStatus: response.status,
    xml: await response.text(),
  }
}

function tallyEndpoint(host: string, port: number) {
  const trimmedHost = host.trim() || 'localhost'
  if (/^https?:\/\//i.test(trimmedHost)) {
    const url = new URL(trimmedHost)
    if (!url.port) url.port = String(port || 9000)
    return url.toString()
  }
  return `http://${trimmedHost}:${port || 9000}`
}

function tallyCompaniesEnvelope() {
  return [
    '<ENVELOPE>',
    '<HEADER>',
    '<VERSION>1</VERSION>',
    '<TALLYREQUEST>Export</TALLYREQUEST>',
    '<TYPE>COLLECTION</TYPE>',
    '<ID>Codex Tally Companies</ID>',
    '</HEADER>',
    '<BODY>',
    '<DESC>',
    '<STATICVARIABLES>',
    '<SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>',
    '</STATICVARIABLES>',
    '<TDL>',
    '<TDLMESSAGE>',
    '<COLLECTION NAME="Codex Tally Companies" ISMODIFY="No">',
    '<TYPE>Company on Disk</TYPE>',
    '<NATIVEMETHOD>Name</NATIVEMETHOD>',
    '</COLLECTION>',
    '</TDLMESSAGE>',
    '</TDL>',
    '</DESC>',
    '</BODY>',
    '</ENVELOPE>',
  ].join('')
}

function tallyCompanyObjectEnvelope(companyName: string) {
  return tallyNamedObjectEnvelope('', 'Company', companyName, ['Name', 'StateName'])
}

function tallyNamedObjectEnvelope(companyName: string, subtype: string, objectName: string, fields: string[]) {
  return [
    '<ENVELOPE>',
    '<HEADER>',
    '<VERSION>1</VERSION>',
    '<TALLYREQUEST>Export</TALLYREQUEST>',
    '<TYPE>OBJECT</TYPE>',
    `<SUBTYPE>${escapeXml(subtype)}</SUBTYPE>`,
    `<ID TYPE="Name">${escapeXml(objectName)}</ID>`,
    '</HEADER>',
    '<BODY>',
    '<DESC>',
    '<STATICVARIABLES>',
    companyName ? `<SVCURRENTCOMPANY>${escapeXml(companyName)}</SVCURRENTCOMPANY>` : '',
    '<SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>',
    '</STATICVARIABLES>',
    '<FETCHLIST>',
    ...fields.map((field) => `<FETCH>${escapeXml(field)}</FETCH>`),
    '</FETCHLIST>',
    '</DESC>',
    '</BODY>',
    '</ENVELOPE>',
  ].join('')
}

function tallyImportEnvelope(companyName: string, requestData: string) {
  return [
    '<ENVELOPE>',
    '<HEADER>',
    '<VERSION>1</VERSION>',
    '<TALLYREQUEST>Import</TALLYREQUEST>',
    '<TYPE>Data</TYPE>',
    '<ID>All Masters</ID>',
    '</HEADER>',
    '<BODY>',
    '<DESC>',
    '<STATICVARIABLES>',
    `<SVCURRENTCOMPANY>${escapeXml(companyName)}</SVCURRENTCOMPANY>`,
    '</STATICVARIABLES>',
    '</DESC>',
    '<DATA>',
    requestData,
    '</DATA>',
    '</BODY>',
    '</ENVELOPE>',
  ].join('')
}

function ledgerImportMessage(record: AnyRow, name: string, groupName: string, address: { text: string | null; state: string | null; country: string | null; pincode: string | null }, action: 'Create' | 'Alter') {
  const gstin = contactGstin(record)
  const phone = stringOrNull(record.primaryPhone ?? record.primary_phone)
  const email = stringOrNull(record.primaryEmail ?? record.primary_email)
  const mailingName = stringOrNull(record.name) || name
  return [
    '<TALLYMESSAGE xmlns:UDF="TallyUDF">',
    `<LEDGER NAME="${escapeXml(name)}" ACTION="${action}">`,
    '<NAME.LIST TYPE="String">',
    `<NAME>${escapeXml(name)}</NAME>`,
    '</NAME.LIST>',
    `<PARENT>${escapeXml(groupName)}</PARENT>`,
    `<MAILINGNAME>${escapeXml(mailingName)}</MAILINGNAME>`,
    '<ISBILLWISEON>Yes</ISBILLWISEON>',
    address.text ? `<ADDRESS.LIST TYPE="String"><ADDRESS>${escapeXml(address.text)}</ADDRESS></ADDRESS.LIST>` : '',
    address.state ? `<STATENAME>${escapeXml(address.state)}</STATENAME>` : '',
    address.country ? `<COUNTRYNAME>${escapeXml(address.country)}</COUNTRYNAME>` : '<COUNTRYNAME>India</COUNTRYNAME>',
    address.pincode ? `<PINCODE>${escapeXml(address.pincode)}</PINCODE>` : '',
    phone ? `<LEDGERPHONE>${escapeXml(phone)}</LEDGERPHONE>` : '',
    email ? `<EMAIL>${escapeXml(email)}</EMAIL>` : '',
    gstin ? '<GSTREGISTRATIONTYPE>Regular</GSTREGISTRATIONTYPE>' : '<GSTREGISTRATIONTYPE>Unregistered</GSTREGISTRATIONTYPE>',
    gstin ? `<PARTYGSTIN>${escapeXml(gstin)}</PARTYGSTIN>` : '',
    '</LEDGER>',
    '</TALLYMESSAGE>',
  ].join('')
}

function unitImportMessage(unitName: string) {
  return [
    '<TALLYMESSAGE xmlns:UDF="TallyUDF">',
    `<UNIT NAME="${escapeXml(unitName)}" ACTION="Create">`,
    `<NAME>${escapeXml(unitName)}</NAME>`,
    `<ORIGINALNAME>${escapeXml(unitName)}</ORIGINALNAME>`,
    '<ISSIMPLEUNIT>Yes</ISSIMPLEUNIT>',
    '</UNIT>',
    '</TALLYMESSAGE>',
  ].join('')
}

function stockItemImportMessage(record: AnyRow, name: string, unitName: string, lookups: CommonLookups, action: 'Create' | 'Alter') {
  const hsnCode = labelFrom(lookups.hsnCodes, record.hsn_code_id)
  return [
    '<TALLYMESSAGE xmlns:UDF="TallyUDF">',
    `<STOCKITEM NAME="${escapeXml(name)}" ACTION="${action}">`,
    '<NAME.LIST TYPE="String">',
    `<NAME>${escapeXml(name)}</NAME>`,
    '</NAME.LIST>',
    '<PARENT>Primary</PARENT>',
    `<BASEUNITS>${escapeXml(unitName)}</BASEUNITS>`,
    hsnCode ? `<HSNCODE>${escapeXml(hsnCode)}</HSNCODE>` : '',
    '</STOCKITEM>',
    '</TALLYMESSAGE>',
  ].join('')
}

function captureXmlTag(xml: string, tag: string) {
  const match = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, 'i').exec(xml)
  return match?.[1]?.trim() || null
}

function extractCompanyNames(xml: string) {
  const names: string[] = []
  const pattern = /<COMPANYONDISK\b[\s\S]*?<NAME\b[^>]*>([\s\S]*?)<\/NAME>/gi
  for (const match of xml.matchAll(pattern)) {
    const name = match[1]?.trim()
    if (name) names.push(name)
  }
  return names
}

function captureCompanyObjectName(xml: string) {
  const attributeMatch = /<COMPANY\b[^>]*\bNAME="([^"]+)"/i.exec(xml)
  if (attributeMatch?.[1]?.trim()) return unescapeXml(attributeMatch[1].trim())
  const objectMatch = /<COMPANY\b[\s\S]*?<NAME(?:\s[^>]*)?>([\s\S]*?)<\/NAME>/i.exec(xml)
  return objectMatch?.[1]?.trim() || null
}

function captureObjectName(xml: string) {
  const attributeMatch = /<(?:COMPANY|LEDGER|STOCKITEM)\b[^>]*\bNAME="([^"]+)"/i.exec(xml)
  if (attributeMatch?.[1]?.trim()) return unescapeXml(attributeMatch[1].trim())
  const objectMatch = /<(?:COMPANY|LEDGER|STOCKITEM)\b[\s\S]*?<NAME(?:\s[^>]*)?>([\s\S]*?)<\/NAME>/i.exec(xml)
  return objectMatch?.[1]?.trim() || null
}

function importCount(xml: string, tag: string) {
  const count = Number(captureXmlTag(xml, tag) ?? 0)
  return Number.isFinite(count) ? count : 0
}

function tallyImportError(xml: string) {
  const lineError = captureXmlTag(xml, 'LINEERROR') || captureXmlTag(xml, 'ERRORMSG')
  if (lineError) return lineError
  const errors = importCount(xml, 'ERRORS')
  const exceptions = importCount(xml, 'EXCEPTIONS')
  const ignored = importCount(xml, 'IGNORED')
  if (errors > 0 || exceptions > 0 || ignored > 0) {
    return `Tally rejected the import. Errors: ${errors}, Exceptions: ${exceptions}, Ignored: ${ignored}.`
  }
  if (captureXmlTag(xml, 'STATUS') === '0') {
    return captureXmlTag(xml, 'DATA') || 'Tally returned STATUS 0 for the import request.'
  }
  return null
}

function compactExcerpt(xml: string) {
  const compact = xml.replace(/\s+/g, ' ').trim()
  return compact ? compact.slice(0, 600) : null
}

function normalizeText(value: string | null | undefined) {
  return (value ?? '').trim().toLowerCase()
}

function escapeXml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')
}

function unescapeXml(value: string) {
  return value
    .replaceAll('&quot;', '"')
    .replaceAll('&apos;', "'")
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&amp;', '&')
}

function stringOrNull(value: unknown) {
  const text = String(value ?? '').trim()
  return text || null
}

function valueOrNull(value: unknown) {
  return value === null || value === undefined || value === '' ? null : String(value)
}

function labelFrom(map: ReadonlyMap<string, string>, value: unknown) {
  if (value === null || value === undefined || value === '') return null
  return map.get(String(value)) ?? String(value)
}

function uniqueStrings(values: Array<string | null | undefined>) {
  return [...new Set(values.map((value) => String(value ?? '').trim()).filter(Boolean))]
}

function booleanValue(value: unknown, fallback = false) {
  if (value === null || value === undefined || value === '') return fallback
  if (typeof value === 'string') return value !== '0' && value.toLowerCase() !== 'false'
  return Boolean(value)
}

function dateString(value: Date | null) {
  return value ? value.toISOString() : null
}
