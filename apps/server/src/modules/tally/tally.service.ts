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
    @Inject(() => TenantContextService) private readonly tenants: TenantContextService,
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

    if (resource === 'defaults') return { resource, rows: [] }
    if (resource === 'contacts') return this.contactSyncList(context, query)
    if (resource === 'products') return this.productSyncList(context, query)
    if (resource === 'sales') return this.salesSyncList(context, query)
    return this.purchaseSyncList(context, query)
  }

  async syncRecords(headers: TenantRequestHeaders, resourceValue: string, input: TallySyncActionInput) {
    const context = await this.tenants.resolve(headers, 'company.manage')
    const resource = assertSyncResource(resourceValue)
    const ids = uniqueStrings(input?.ids ?? [])

    if (resource === 'defaults') return this.syncDefaults(context)

    if (!ids.length) {
      throw new BadRequestException('Select at least one record to sync.')
    }

    if (resource === 'contacts') return this.syncContacts(context, ids)
    if (resource === 'products') return this.syncProducts(context, ids)
    if (resource === 'sales') return this.syncSales(context, ids)
    return this.queuePurchase(context, ids)
  }

  private async syncDefaults(context: TenantRuntimeContext) {
    const settings = await this.requireValidatedSettings(context)
    await ensureTallyDefaultMasters(settings)
    return { ok: true, summary: { synced: TALLY_DEFAULT_UNITS.length, failed: 0 } }
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
    await ensureTallyDefaultMasters(settings)
    const records = ((await this.products.list(context)) as AnyRow[]).filter((record) => ids.includes(String(record.uuid)))
    const summary = { failed: 0, synced: 0 }

    for (const record of records) {
      const result = await syncProductToTally(settings, record, lookups).catch((error) => ({
        ok: false,
        error: error instanceof Error ? error.message : 'Tally product sync failed.',
        payload: null,
        tallyGuid: null,
        tallyName: productDisplayName(record),
      }))
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

  private async syncSales(context: TenantRuntimeContext, ids: string[]) {
    const settings = await this.requireValidatedSettings(context)
    const links = await this.linkMap(context, ['contacts', 'products', 'sales'])
    const entries = ((await this.salesEntries.list(context)) as AnyRow[]).filter((entry) => ids.includes(String(entry.uuid)))
    const summary = { failed: 0, synced: 0 }

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

      const result = await syncSalesEntryToTally(settings, entry, links).catch((error) => ({
        ok: false,
        error: error instanceof Error ? error.message : 'Tally sales voucher sync failed.',
        payload: null,
        tallyGuid: null,
        tallyName: String(entry.invoice_no ?? ''),
      }))
      await this.tally.saveSyncLink(context, {
        module_key: 'sales',
        record_type: 'entry',
        record_id: valueOrNull(entry.id),
        record_uuid: String(entry.uuid),
        record_label: String(entry.invoice_no ?? ''),
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
  const gstin = contactGstin(record)
  const address = contactAddress(record, lookups)
  if (gstin && !validTallyGstinOrUin(gstin)) {
    return {
      ok: false,
      error: `GSTIN/UIN "${gstin}" is invalid. Tally requires a 15-character GSTIN/UIN before it will load tax registration details.`,
      payload: null,
      tallyGuid: null,
      tallyName: name,
    }
  }
  const objectBefore = await fetchTallyObjectByName(endpoint, companyName, 'Ledger', name, ['Name', 'MasterID', 'Parent'])
  const action = objectBefore.found ? 'Alter' : 'Create'
  const importResponse = await postTallyXml(endpoint, tallyImportEnvelope(companyName, ledgerImportMessage(record, name, groupName, address, action)))
  const importError = tallyImportError(importResponse.xml)
  if (importError) {
    return { ok: false, error: importError, payload: compactExcerpt(importResponse.xml), tallyGuid: null, tallyName: name }
  }

  const objectAfter = await fetchTallyObjectByName(endpoint, companyName, 'Ledger', name, [
    'Name',
    'MasterID',
    'Parent',
    'Address',
    'StateName',
    'CountryName',
    'PinCode',
    'LedMailingDetails',
    'PARTYGSTIN',
    'GSTIN',
    'GSTRegistrationType',
    'LedGSTRegDetails',
  ])
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

  const returnedGstin = captureXmlTag(objectAfter.xml, 'PARTYGSTIN') || captureXmlTag(objectAfter.xml, 'GSTIN')
  if (gstin && normalizeText(returnedGstin) !== normalizeText(gstin)) {
    return {
      ok: false,
      error: `Tally imported the ledger "${name}", but did not return the GSTIN/UIN "${gstin}". Check the contact GSTIN format/state and retry.`,
      payload: {
        import_response: compactExcerpt(importResponse.xml),
        verification_response: compactExcerpt(objectAfter.xml),
      },
      tallyGuid: null,
      tallyName: name,
    }
  }

  const missingAddressLine = address.lines.find((line) => !xmlIncludesNormalized(objectAfter.xml, line))
  if (missingAddressLine) {
    return {
      ok: false,
      error: `Tally imported the ledger "${name}", but did not return address line "${missingAddressLine}". Check Tally mailing details and retry.`,
      payload: {
        import_response: compactExcerpt(importResponse.xml),
        verification_response: compactExcerpt(objectAfter.xml),
      },
      tallyGuid: null,
      tallyName: name,
    }
  }

  if (address.pincode && !xmlIncludesNormalized(objectAfter.xml, address.pincode)) {
    return {
      ok: false,
      error: `Tally imported the ledger "${name}", but did not return pincode "${address.pincode}". Check Tally mailing details and retry.`,
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
  const unitName = tallyUnitDefinition(productUnitLabel(record, lookups) || 'Nos').name
  const groupName = productStockGroupName(record, lookups)
  await ensureTallyUnit(endpoint, companyName, unitName)
  if (groupName) await ensureTallyStockGroup(endpoint, companyName, groupName)
  const objectBefore = await fetchTallyObjectByName(endpoint, companyName, 'Stock Item', name, ['Name', 'MasterID', 'BaseUnits'])
  const action = objectBefore.found ? 'Alter' : 'Create'
  const importResponse = await postTallyXml(endpoint, tallyImportEnvelope(companyName, stockItemImportMessage(record, name, unitName, groupName, lookups, action)))
  const importError = tallyImportError(importResponse.xml)
  if (importError) {
    return { ok: false, error: importError, payload: compactExcerpt(importResponse.xml), tallyGuid: null, tallyName: name }
  }

  const objectAfter = await fetchTallyObjectByName(endpoint, companyName, 'Stock Item', name, [
    'Name',
    'MasterID',
    'Parent',
    'BaseUnits',
    'GSTApplicable',
    'GSTTypeOfSupply',
    'GSTDetails',
    'HSNCode',
  ])
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

  if (normalizeText(captureXmlTag(objectAfter.xml, 'BASEUNITS')) !== normalizeText(unitName)) {
    return {
      ok: false,
      error: `Tally imported the stock item "${name}", but did not return base unit "${unitName}".`,
      payload: {
        import_response: compactExcerpt(importResponse.xml),
        verification_response: compactExcerpt(objectAfter.xml),
      },
      tallyGuid: null,
      tallyName: name,
    }
  }

  if (groupName && !xmlIncludesNormalized(objectAfter.xml, groupName)) {
    return {
      ok: false,
      error: `Tally imported the stock item "${name}", but did not return stock group "${groupName}".`,
      payload: {
        import_response: compactExcerpt(importResponse.xml),
        verification_response: compactExcerpt(objectAfter.xml),
      },
      tallyGuid: null,
      tallyName: name,
    }
  }

  const hsnCode = productHsnCode(record, lookups)
  if (hsnCode && !xmlIncludesNormalized(objectAfter.xml, hsnCode)) {
    return {
      ok: false,
      error: `Tally imported the stock item "${name}", but did not return HSN "${hsnCode}".`,
      payload: {
        import_response: compactExcerpt(importResponse.xml),
        verification_response: compactExcerpt(objectAfter.xml),
      },
      tallyGuid: null,
      tallyName: name,
    }
  }

  const taxRate = productTaxRate(record, lookups)
  if (taxRate > 0 && !xmlIncludesNormalized(objectAfter.xml, formatTallyNumber(taxRate))) {
    return {
      ok: false,
      error: `Tally imported the stock item "${name}", but did not return GST rate "${formatTallyNumber(taxRate)}".`,
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

async function syncSalesEntryToTally(settings: TallySettings, entry: AnyRow, links: Map<string, TallySyncLink>) {
  const endpoint = tallyEndpoint(settings.tally_host, settings.tally_port)
  const companyName = settings.company_name?.trim() ?? ''
  const invoiceNo = String(entry.invoice_no ?? '').trim()
  if (!invoiceNo) throw new Error('Sales invoice number is required before exporting to Tally.')

  const customerLink = links.get(`contacts:${String(entry.customer_id)}`)
  const customerName = customerLink?.tally_name || String(entry.customer_name ?? '').trim()
  if (!customerName) throw new Error('Sales invoice customer is required before exporting to Tally.')

  const customer = await fetchTallyObjectByName(endpoint, companyName, 'Ledger', customerName, ['Name', 'MasterID', 'Parent'])
  if (!customer.found) {
    throw new Error(`Tally does not contain the synced customer ledger "${customerName}". Resync the contact before exporting this sales invoice.`)
  }

  const itemLinks = salesItemLinks(entry, links)
  const tallyItems: TallySalesVoucherItem[] = []
  for (const item of salesItems(entry)) {
    const productLink = itemLinks.get(String(item.product_id))
    const itemName = productLink?.tally_name || String(item.product_name ?? '').trim()
    if (!itemName) throw new Error('Sales invoice contains an item without a Tally stock item name.')

    const stockItem = await fetchTallyObjectByName(endpoint, companyName, 'Stock Item', itemName, ['Name', 'MasterID', 'BaseUnits'])
    if (!stockItem.found) {
      throw new Error(`Tally does not contain the synced stock item "${itemName}". Resync the product before exporting this sales invoice.`)
    }

    tallyItems.push({
      amount: salesItemTaxableAmount(item),
      description: stringOrNull(item.description),
      hsnCode: stringOrNull(item.hsn_code),
      name: stockItem.name || itemName,
      quantity: Math.abs(numberValue(item.quantity)),
      rate: numberValue(item.rate),
      taxAmount: numberValue(item.tax_amount),
      taxRate: numberValue(item.tax_rate),
      unitName: captureXmlTag(stockItem.xml, 'BASEUNITS') || stringOrNull(item.unit),
    })
  }

  if (!tallyItems.length) throw new Error('Sales invoice must contain at least one item before exporting to Tally.')

  const isIgst = normalizeText(entry.place_of_supply) === 'igst'
  await ensureTallySalesVoucherLedgers(endpoint, companyName, isIgst, numberValue(entry.round_off) !== 0)

  const importResponse = await postTallyXml(endpoint, tallyVoucherImportEnvelope(companyName, salesVoucherImportMessage(entry, {
    action: links.get(`sales:${String(entry.uuid)}`)?.status === 'synced' ? 'Alter' : 'Create',
    customerName: customer.name || customerName,
    invoiceNo,
    isIgst,
    items: tallyItems,
  })))
  const importError = tallyImportError(importResponse.xml)
  if (importError) {
    return { ok: false, error: importError, payload: compactExcerpt(importResponse.xml), tallyGuid: null, tallyName: invoiceNo }
  }

  return {
    ok: true,
    error: null,
    payload: compactExcerpt(importResponse.xml),
    tallyGuid: captureXmlTag(importResponse.xml, 'LASTVCHID') || captureXmlTag(importResponse.xml, 'MASTERID'),
    tallyName: invoiceNo,
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

async function ensureTallyDefaultMasters(settings: TallySettings) {
  const endpoint = tallyEndpoint(settings.tally_host, settings.tally_port)
  const companyName = settings.company_name?.trim() ?? ''
  const response = await postTallyXml(endpoint, tallyImportEnvelope(companyName, TALLY_DEFAULT_UNITS.map((unit) => unitImportMessage(unit, 'Alter')).join('')), 60_000)
  const error = tallyImportError(response.xml)
  if (error && !/duplicate/i.test(error)) throw new Error(`Tally default unit bootstrap failed: ${error}`)
}

async function ensureTallyUnit(endpoint: string, companyName: string, unitName: string) {
  const unit = tallyUnitDefinition(unitName)
  const existing = await fetchTallyObjectByName(endpoint, companyName, 'Unit', unit.name, ['Name', 'OriginalName', 'FormalName', 'GSTRepUOM', 'DecimalPlaces'])
  const hasUqc = normalizeText(captureXmlTag(existing.xml, 'GSTREPUOM')) === normalizeText(unit.uqc)
  if (existing.found && hasUqc) return

  const response = await postTallyXml(endpoint, tallyImportEnvelope(companyName, unitImportMessage(unit, existing.found ? 'Alter' : 'Create')))
  const error = tallyImportError(response.xml)
  if (error && !/duplicate/i.test(error)) throw new Error(`Tally unit "${unit.name}" import failed: ${error}`)
}

async function ensureTallyStockGroup(endpoint: string, companyName: string, groupName: string) {
  const existing = await fetchTallyObjectByName(endpoint, companyName, 'Stock Group', groupName, ['Name', 'Parent'])
  if (existing.found) return
  const response = await postTallyXml(endpoint, tallyImportEnvelope(companyName, stockGroupImportMessage(groupName)))
  const error = tallyImportError(response.xml)
  if (error && !/duplicate/i.test(error)) throw new Error(`Tally stock group "${groupName}" import failed: ${error}`)
}

async function ensureTallySalesVoucherLedgers(endpoint: string, companyName: string, isIgst: boolean, hasRoundOff: boolean) {
  const ledgers = [
    { name: 'Sales', parent: 'Sales Accounts', taxHead: null },
    ...(isIgst
      ? [{ name: 'Output IGST', parent: 'Duties & Taxes', taxHead: 'Integrated Tax' }]
      : [
        { name: 'Output CGST', parent: 'Duties & Taxes', taxHead: 'Central Tax' },
        { name: 'Output SGST', parent: 'Duties & Taxes', taxHead: 'State Tax' },
      ]),
    ...(hasRoundOff ? [{ name: 'Round Off', parent: 'Indirect Expenses', taxHead: null }] : []),
  ]

  for (const ledger of ledgers) {
    await ensureSimpleTallyLedger(endpoint, companyName, ledger.name, ledger.parent, ledger.taxHead)
  }
}

async function ensureSimpleTallyLedger(endpoint: string, companyName: string, name: string, parent: string, taxHead: string | null) {
  const existing = await fetchTallyObjectByName(endpoint, companyName, 'Ledger', name, ['Name', 'Parent', 'TaxType', 'GSTDutyHead'])
  if (existing.found) return

  const response = await postTallyXml(endpoint, tallyImportEnvelope(companyName, simpleLedgerImportMessage(name, parent, taxHead)))
  const error = tallyImportError(response.xml)
  if (error && !/duplicate/i.test(error)) throw new Error(`Tally ledger "${name}" import failed: ${error}`)
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

interface ContactAddress {
  city: string | null
  country: string | null
  line1: string | null
  line2: string | null
  lines: string[]
  pincode: string | null
  state: string | null
  text: string | null
}

interface TallyUnitDefinition {
  decimalPlaces: number
  formalName: string
  name: string
  uqc: string
}

interface TallySalesVoucherItem {
  amount: number
  description: string | null
  hsnCode: string | null
  name: string
  quantity: number
  rate: number
  taxAmount: number
  taxRate: number
  unitName: string | null
}

interface TallySalesVoucherInput {
  action: 'Create' | 'Alter'
  customerName: string
  invoiceNo: string
  isIgst: boolean
  items: TallySalesVoucherItem[]
}

const TALLY_DEFAULT_UNITS: TallyUnitDefinition[] = [
  { name: 'Bags', formalName: 'Bags', uqc: 'BAG-BAGS', decimalPlaces: 0 },
  { name: 'Bale', formalName: 'Bale', uqc: 'BAL-BALE', decimalPlaces: 0 },
  { name: 'Bundles', formalName: 'Bundles', uqc: 'BDL-BUNDLES', decimalPlaces: 0 },
  { name: 'Buckles', formalName: 'Buckles', uqc: 'BKL-BUCKLES', decimalPlaces: 0 },
  { name: 'Billion Units', formalName: 'Billion Units', uqc: 'BOU-BILLION OF UNITS', decimalPlaces: 0 },
  { name: 'Box', formalName: 'Box', uqc: 'BOX-BOX', decimalPlaces: 0 },
  { name: 'Bottles', formalName: 'Bottles', uqc: 'BTL-BOTTLES', decimalPlaces: 0 },
  { name: 'Bunches', formalName: 'Bunches', uqc: 'BUN-BUNCHES', decimalPlaces: 0 },
  { name: 'Cans', formalName: 'Cans', uqc: 'CAN-CANS', decimalPlaces: 0 },
  { name: 'Cubic Meters', formalName: 'Cubic Meters', uqc: 'CBM-CUBIC METERS', decimalPlaces: 2 },
  { name: 'Cubic Centimeters', formalName: 'Cubic Centimeters', uqc: 'CCM-CUBIC CENTIMETERS', decimalPlaces: 2 },
  { name: 'Centimeters', formalName: 'Centimeters', uqc: 'CMS-CENTIMETERS', decimalPlaces: 2 },
  { name: 'Cartons', formalName: 'Cartons', uqc: 'CTN-CARTONS', decimalPlaces: 0 },
  { name: 'Dozen', formalName: 'Dozen', uqc: 'DOZ-DOZEN', decimalPlaces: 0 },
  { name: 'Drums', formalName: 'Drums', uqc: 'DRM-DRUMS', decimalPlaces: 0 },
  { name: 'Great Gross', formalName: 'Great Gross', uqc: 'GGK-GREAT GROSS', decimalPlaces: 0 },
  { name: 'Gram', formalName: 'Gram', uqc: 'GMS-GRAMMES', decimalPlaces: 2 },
  { name: 'Gross', formalName: 'Gross', uqc: 'GRS-GROSS', decimalPlaces: 0 },
  { name: 'Gross Yards', formalName: 'Gross Yards', uqc: 'GYD-GROSS YARDS', decimalPlaces: 2 },
  { name: 'Kg', formalName: 'Kilogram', uqc: 'KGS-KILOGRAMS', decimalPlaces: 2 },
  { name: 'Kilolitre', formalName: 'Kilolitre', uqc: 'KLR-KILOLITRE', decimalPlaces: 2 },
  { name: 'Kilometre', formalName: 'Kilometre', uqc: 'KME-KILOMETRE', decimalPlaces: 2 },
  { name: 'Litre', formalName: 'Litre', uqc: 'LTR-LITRES', decimalPlaces: 2 },
  { name: 'Millilitre', formalName: 'Millilitre', uqc: 'MLT-MILLILITRE', decimalPlaces: 2 },
  { name: 'Meter', formalName: 'Meter', uqc: 'MTR-METERS', decimalPlaces: 2 },
  { name: 'Metric Ton', formalName: 'Metric Ton', uqc: 'MTS-METRIC TON', decimalPlaces: 2 },
  { name: 'Nos', formalName: 'Numbers', uqc: 'NOS-NUMBERS', decimalPlaces: 0 },
  { name: 'Others', formalName: 'Others', uqc: 'OTH-OTHERS', decimalPlaces: 0 },
  { name: 'Packs', formalName: 'Packs', uqc: 'PAC-PACKS', decimalPlaces: 0 },
  { name: 'Pcs', formalName: 'Pieces', uqc: 'PCS-PIECES', decimalPlaces: 0 },
  { name: 'Pair', formalName: 'Pairs', uqc: 'PRS-PAIRS', decimalPlaces: 0 },
  { name: 'Quintal', formalName: 'Quintal', uqc: 'QTL-QUINTAL', decimalPlaces: 2 },
  { name: 'Rolls', formalName: 'Rolls', uqc: 'ROL-ROLLS', decimalPlaces: 0 },
  { name: 'Sets', formalName: 'Sets', uqc: 'SET-SETS', decimalPlaces: 0 },
  { name: 'Square Feet', formalName: 'Square Feet', uqc: 'SQF-SQUARE FEET', decimalPlaces: 2 },
  { name: 'Square Meters', formalName: 'Square Meters', uqc: 'SQM-SQUARE METERS', decimalPlaces: 2 },
  { name: 'Square Yards', formalName: 'Square Yards', uqc: 'SQY-SQUARE YARDS', decimalPlaces: 2 },
  { name: 'Tablets', formalName: 'Tablets', uqc: 'TBS-TABLETS', decimalPlaces: 0 },
  { name: 'Ten Gross', formalName: 'Ten Gross', uqc: 'TGM-TEN GROSS', decimalPlaces: 0 },
  { name: 'Thousands', formalName: 'Thousands', uqc: 'THD-THOUSANDS', decimalPlaces: 0 },
  { name: 'Tonnes', formalName: 'Tonnes', uqc: 'TON-TONNES', decimalPlaces: 2 },
  { name: 'Tubes', formalName: 'Tubes', uqc: 'TUB-TUBES', decimalPlaces: 0 },
  { name: 'US Gallons', formalName: 'US Gallons', uqc: 'UGS-US GALLONS', decimalPlaces: 2 },
  { name: 'Units', formalName: 'Units', uqc: 'UNT-UNITS', decimalPlaces: 0 },
  { name: 'Yards', formalName: 'Yards', uqc: 'YDS-YARDS', decimalPlaces: 2 },
]

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

function productStockGroupName(record: AnyRow, lookups: CommonLookups) {
  const groupName = labelFrom(lookups.productTypes, record.product_type_id)
  if (!groupName || groupName === '-') return null
  return groupName
}

function productHsnCode(record: AnyRow, lookups: CommonLookups) {
  const hsnCode = labelFrom(lookups.hsnCodes, record.hsn_code_id)
  if (!hsnCode || hsnCode === '-' || hsnCode === '00000000') return null
  return hsnCode
}

function productTaxRate(record: AnyRow, lookups: CommonLookups) {
  const label = labelFrom(lookups.taxes, record.tax_id)
  const rate = Number(String(label ?? '').replace('%', '').trim())
  return Number.isFinite(rate) ? rate : 0
}

function contactGstin(record: AnyRow) {
  const gstin = stringOrNull(record.gstin ?? record.gstIn ?? record.gst_in)
  if (gstin) return gstin
  if (Array.isArray(record.gstDetails)) {
    const ordered = [
      ...record.gstDetails.filter((detail) => booleanValue(detail?.isDefault ?? detail?.is_default)),
      ...record.gstDetails.filter((detail) => !booleanValue(detail?.isDefault ?? detail?.is_default)),
    ]
    for (const detail of ordered) {
      const current = stringOrNull(detail?.gstin ?? detail?.gstIn ?? detail?.gst_in)
      if (current) return current
    }
  }
  return null
}

function contactGstState(record: AnyRow) {
  if (!Array.isArray(record.gstDetails)) return null
  const selected = record.gstDetails.find((detail) => booleanValue(detail?.isDefault ?? detail?.is_default)) ?? record.gstDetails[0]
  return stringOrNull(selected?.state)
}

function contactAddress(record: AnyRow, lookups: CommonLookups): ContactAddress {
  const addresses = Array.isArray(record.addresses) ? record.addresses : []
  const selected = addresses.find((address) => booleanValue(address?.isDefault ?? address?.is_default)) ?? addresses[0] ?? null
  if (!selected) return { city: null, country: 'India', line1: null, line2: null, lines: [], pincode: null, state: contactGstState(record), text: null }

  const line1 = stringOrNull(selected.addressLine1 ?? selected.address_line1)
  const line2 = stringOrNull(selected.addressLine2 ?? selected.address_line2)
  const city = labelFrom(lookups.cities, selected.cityId ?? selected.city_id)
  const district = labelFrom(lookups.districts, selected.districtId ?? selected.district_id)
  const state = labelFrom(lookups.states, selected.stateId ?? selected.state_id) ?? contactGstState(record)
  const pincode = labelFrom(lookups.pincodes, selected.pincodeId ?? selected.pincode_id)
  const country = labelFrom(lookups.countries, selected.countryId ?? selected.country_id) || 'India'
  const lines = uniqueStrings([line1, line2, city])

  const parts = [
    line1,
    line2,
    city,
    district,
    state,
    pincode,
    country,
  ].filter(Boolean) as string[]

  return {
    city,
    country,
    line1,
    line2,
    lines,
    pincode,
    state,
    text: parts.join(', '),
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
  if (value === 'contacts' || value === 'products' || value === 'sales' || value === 'purchase' || value === 'defaults') return value
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

async function postTallyXml(endpoint: string, xml: string, timeoutMs = 15_000) {
  const response = await fetch(endpoint, {
    body: xml,
    headers: {
      Accept: 'application/xml, text/xml;q=0.9, */*;q=0.8',
      'Content-Type': 'text/xml; charset=utf-8',
    },
    method: 'POST',
    signal: AbortSignal.timeout(timeoutMs),
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

function tallyVoucherImportEnvelope(companyName: string, requestData: string) {
  return [
    '<ENVELOPE>',
    '<HEADER>',
    '<VERSION>1</VERSION>',
    '<TALLYREQUEST>Import</TALLYREQUEST>',
    '<TYPE>Data</TYPE>',
    '<ID>Vouchers</ID>',
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

function simpleLedgerImportMessage(name: string, parent: string, taxHead: string | null) {
  return [
    '<TALLYMESSAGE xmlns:UDF="TallyUDF">',
    `<LEDGER NAME="${escapeXml(name)}" ACTION="Create">`,
    '<NAME.LIST TYPE="String">',
    `<NAME>${escapeXml(name)}</NAME>`,
    '</NAME.LIST>',
    `<PARENT>${escapeXml(parent)}</PARENT>`,
    '<ISBILLWISEON>No</ISBILLWISEON>',
    taxHead ? '<TAXTYPE>GST</TAXTYPE>' : '',
    taxHead ? `<GSTDUTYHEAD>${escapeXml(taxHead)}</GSTDUTYHEAD>` : '',
    taxHead ? `<DUTYHEAD>${escapeXml(taxHead)}</DUTYHEAD>` : '',
    '</LEDGER>',
    '</TALLYMESSAGE>',
  ].join('')
}

function ledgerImportMessage(record: AnyRow, name: string, groupName: string, address: ContactAddress, action: 'Create' | 'Alter') {
  const gstin = contactGstin(record)
  const phone = stringOrNull(record.primaryPhone ?? record.primary_phone)
  const email = stringOrNull(record.primaryEmail ?? record.primary_email)
  const mailingName = stringOrNull(record.name) || name
  const pan = stringOrNull(record.pan ?? record.panNo ?? record.pan_no)
  const addressLines = address.lines.length ? address.lines : address.text ? [address.text] : []
  const gstApplicableFrom = tallyDate()
  return [
    '<TALLYMESSAGE xmlns:UDF="TallyUDF">',
    `<LEDGER NAME="${escapeXml(name)}" ACTION="${action}">`,
    '<NAME.LIST TYPE="String">',
    `<NAME>${escapeXml(name)}</NAME>`,
    '</NAME.LIST>',
    `<PARENT>${escapeXml(groupName)}</PARENT>`,
    `<MAILINGNAME>${escapeXml(mailingName)}</MAILINGNAME>`,
    '<ISBILLWISEON>Yes</ISBILLWISEON>',
    addressLines.length ? [
      '<ADDRESS.LIST TYPE="String">',
      ...addressLines.map((line) => `<ADDRESS>${escapeXml(line)}</ADDRESS>`),
      '</ADDRESS.LIST>',
    ].join('') : '',
    address.state ? `<STATENAME>${escapeXml(address.state)}</STATENAME>` : '',
    address.country ? `<COUNTRYNAME>${escapeXml(address.country)}</COUNTRYNAME>` : '<COUNTRYNAME>India</COUNTRYNAME>',
    address.country ? `<COUNTRYOFRESIDENCE>${escapeXml(address.country)}</COUNTRYOFRESIDENCE>` : '<COUNTRYOFRESIDENCE>India</COUNTRYOFRESIDENCE>',
    address.pincode ? `<PINCODE>${escapeXml(address.pincode)}</PINCODE>` : '',
    addressLines.length ? [
      '<LEDMAILINGDETAILS.LIST>',
      `<APPLICABLEFROM>${gstApplicableFrom}</APPLICABLEFROM>`,
      '<ADDRESS.LIST TYPE="String">',
      ...addressLines.map((line) => `<ADDRESS>${escapeXml(line)}</ADDRESS>`),
      '</ADDRESS.LIST>',
      `<MAILINGNAME>${escapeXml(mailingName)}</MAILINGNAME>`,
      address.state ? `<STATE>${escapeXml(address.state)}</STATE>` : '',
      address.country ? `<COUNTRY>${escapeXml(address.country)}</COUNTRY>` : '<COUNTRY>India</COUNTRY>',
      address.pincode ? `<PINCODE>${escapeXml(address.pincode)}</PINCODE>` : '',
      '</LEDMAILINGDETAILS.LIST>',
    ].join('') : '',
    phone ? `<LEDGERPHONE>${escapeXml(phone)}</LEDGERPHONE>` : '',
    email ? `<EMAIL>${escapeXml(email)}</EMAIL>` : '',
    pan ? `<INCOMETAXNUMBER>${escapeXml(pan)}</INCOMETAXNUMBER>` : '',
    gstin ? '<GSTREGISTRATIONTYPE>Regular</GSTREGISTRATIONTYPE>' : '<GSTREGISTRATIONTYPE>Unregistered</GSTREGISTRATIONTYPE>',
    gstin ? `<PARTYGSTIN>${escapeXml(gstin)}</PARTYGSTIN>` : '',
    gstin ? `<GSTIN>${escapeXml(gstin)}</GSTIN>` : '',
    gstin ? [
      '<LEDGSTREGDETAILS.LIST>',
      `<APPLICABLEFROM>${gstApplicableFrom}</APPLICABLEFROM>`,
      address.state ? `<STATE>${escapeXml(address.state)}</STATE>` : '',
      address.state ? `<PLACEOFSUPPLY>${escapeXml(address.state)}</PLACEOFSUPPLY>` : '',
      '<GSTREGISTRATIONTYPE>Regular</GSTREGISTRATIONTYPE>',
      `<GSTIN>${escapeXml(gstin)}</GSTIN>`,
      '</LEDGSTREGDETAILS.LIST>',
    ].join('') : '',
    '</LEDGER>',
    '</TALLYMESSAGE>',
  ].join('')
}

function unitImportMessage(unit: TallyUnitDefinition, action: 'Create' | 'Alter') {
  return [
    '<TALLYMESSAGE xmlns:UDF="TallyUDF">',
    `<UNIT NAME="${escapeXml(unit.name)}" ACTION="${action}">`,
    `<NAME>${escapeXml(unit.name)}</NAME>`,
    `<ORIGINALNAME>${escapeXml(unit.formalName)}</ORIGINALNAME>`,
    `<FORMALNAME>${escapeXml(unit.formalName)}</FORMALNAME>`,
    `<GSTREPUOM>${escapeXml(unit.uqc)}</GSTREPUOM>`,
    '<ISSIMPLEUNIT>Yes</ISSIMPLEUNIT>',
    `<DECIMALPLACES>${unit.decimalPlaces}</DECIMALPLACES>`,
    '</UNIT>',
    '</TALLYMESSAGE>',
  ].join('')
}

function tallyUnitDefinition(unitName: string): TallyUnitDefinition {
  const normalized = normalizeText(unitName)
  const aliases: Record<string, string> = {
    bag: 'Bags',
    bags: 'Bags',
    bale: 'Bale',
    bales: 'Bale',
    bdl: 'Bundles',
    bundle: 'Bundles',
    bundles: 'Bundles',
    box: 'Box',
    boxes: 'Box',
    bottle: 'Bottles',
    bottles: 'Bottles',
    can: 'Cans',
    cans: 'Cans',
    carton: 'Cartons',
    cartons: 'Cartons',
    cm: 'Centimeters',
    cms: 'Centimeters',
    centimeter: 'Centimeters',
    centimeters: 'Centimeters',
    dozen: 'Dozen',
    doz: 'Dozen',
    drum: 'Drums',
    drums: 'Drums',
    gm: 'Gram',
    gram: 'Gram',
    grams: 'Gram',
    kg: 'Kg',
    kgs: 'Kg',
    kilogram: 'Kg',
    kilograms: 'Kg',
    litre: 'Litre',
    liter: 'Litre',
    ltr: 'Litre',
    meter: 'Meter',
    metre: 'Meter',
    mtr: 'Meter',
    nos: 'Nos',
    no: 'Nos',
    number: 'Nos',
    numbers: 'Nos',
    packet: 'Packs',
    packets: 'Packs',
    pack: 'Packs',
    packs: 'Packs',
    pair: 'Pair',
    pairs: 'Pair',
    pc: 'Pcs',
    pcs: 'Pcs',
    pieces: 'Pcs',
    piece: 'Pcs',
    roll: 'Rolls',
    rolls: 'Rolls',
    set: 'Sets',
    sets: 'Sets',
    ton: 'Tonnes',
    tonne: 'Tonnes',
    tonnes: 'Tonnes',
    unit: 'Units',
    units: 'Units',
    yard: 'Yards',
    yards: 'Yards',
  }
  const canonicalName = aliases[normalized] ?? unitName
  return TALLY_DEFAULT_UNITS.find((unit) => normalizeText(unit.name) === normalizeText(canonicalName)) ?? {
    name: unitName,
    formalName: unitName,
    uqc: 'OTH-OTHERS',
    decimalPlaces: 2,
  }
}

function stockGroupImportMessage(groupName: string) {
  return [
    '<TALLYMESSAGE xmlns:UDF="TallyUDF">',
    `<STOCKGROUP NAME="${escapeXml(groupName)}" ACTION="Create">`,
    `<NAME>${escapeXml(groupName)}</NAME>`,
    '<PARENT>&#4; Primary</PARENT>',
    '<ISSUBLEDGER>No</ISSUBLEDGER>',
    '</STOCKGROUP>',
    '</TALLYMESSAGE>',
  ].join('')
}

function stockItemImportMessage(record: AnyRow, name: string, unitName: string, groupName: string | null, lookups: CommonLookups, action: 'Create' | 'Alter') {
  const hsnCode = productHsnCode(record, lookups)
  const taxRate = productTaxRate(record, lookups)
  const halfTaxRate = taxRate / 2
  return [
    '<TALLYMESSAGE xmlns:UDF="TallyUDF">',
    `<STOCKITEM NAME="${escapeXml(name)}" ACTION="${action}">`,
    '<NAME.LIST TYPE="String">',
    `<NAME>${escapeXml(name)}</NAME>`,
    '</NAME.LIST>',
    groupName ? `<PARENT>${escapeXml(groupName)}</PARENT>` : '<PARENT>&#4; Primary</PARENT>',
    `<BASEUNITS>${escapeXml(unitName)}</BASEUNITS>`,
    '<GSTTYPEOFSUPPLY>Goods</GSTTYPEOFSUPPLY>',
    hsnCode || taxRate > 0 ? '<GSTAPPLICABLE>&#4; Applicable</GSTAPPLICABLE>' : '',
    hsnCode ? '<GSTHSNNAME>&#4; Specify Details Here</GSTHSNNAME>' : '',
    hsnCode ? `<GSTHSNCODE>${escapeXml(hsnCode)}</GSTHSNCODE>` : '',
    hsnCode ? `<HSNCODE>${escapeXml(hsnCode)}</HSNCODE>` : '',
    hsnCode || taxRate > 0 ? [
      '<GSTDETAILS.LIST>',
      `<APPLICABLEFROM>${tallyDate()}</APPLICABLEFROM>`,
      '<CALCULATIONTYPE>On Value</CALCULATIONTYPE>',
      hsnCode ? `<HSNCODE>${escapeXml(hsnCode)}</HSNCODE>` : '',
      hsnCode ? `<HSN>${escapeXml(hsnCode)}</HSN>` : '',
      '<TAXABILITY>Taxable</TAXABILITY>',
      '<SRCOFGSTDETAILS>&#4; Specify Details Here</SRCOFGSTDETAILS>',
      taxRate > 0 ? [
        '<STATEWISEDETAILS.LIST>',
        '<STATENAME>&#4; Any</STATENAME>',
        gstRateDetail('Integrated Tax', taxRate),
        gstRateDetail('Central Tax', halfTaxRate),
        gstRateDetail('State Tax', halfTaxRate),
        '</STATEWISEDETAILS.LIST>',
      ].join('') : '',
      '</GSTDETAILS.LIST>',
    ].join('') : '',
    '</STOCKITEM>',
    '</TALLYMESSAGE>',
  ].join('')
}

function salesVoucherImportMessage(entry: AnyRow, input: TallySalesVoucherInput) {
  const date = tallyDateFrom(entry.invoice_date)
  const referenceNo = stringOrNull(entry.reference_no)
  const taxLines = salesVoucherTaxLedgerLines(input.items, input.isIgst)
  const roundOff = numberValue(entry.round_off)
  return [
    '<TALLYMESSAGE xmlns:UDF="TallyUDF">',
    `<VOUCHER VCHTYPE="Sales" ACTION="${input.action}" OBJVIEW="Invoice Voucher View">`,
    `<DATE>${date}</DATE>`,
    `<EFFECTIVEDATE>${date}</EFFECTIVEDATE>`,
    '<VOUCHERTYPENAME>Sales</VOUCHERTYPENAME>',
    `<VOUCHERNUMBER>${escapeXml(input.invoiceNo)}</VOUCHERNUMBER>`,
    referenceNo ? `<REFERENCE>${escapeXml(referenceNo)}</REFERENCE>` : '',
    `<PARTYLEDGERNAME>${escapeXml(input.customerName)}</PARTYLEDGERNAME>`,
    '<PERSISTEDVIEW>Invoice Voucher View</PERSISTEDVIEW>',
    '<ISINVOICE>Yes</ISINVOICE>',
    '<ISVATDUTYPAID>Yes</ISVATDUTYPAID>',
    salesPartyLedgerEntry(input.customerName, -Math.abs(numberValue(entry.grand_total))),
    ...input.items.map((item) => salesInventoryEntry(item)),
    ...taxLines.map((line) => salesTaxLedgerEntry(line.ledgerName, line.amount)),
    roundOff !== 0 ? salesTaxLedgerEntry('Round Off', roundOff) : '',
    '</VOUCHER>',
    '</TALLYMESSAGE>',
  ].join('')
}

function salesPartyLedgerEntry(ledgerName: string, amount: number) {
  return [
    '<ALLLEDGERENTRIES.LIST>',
    `<LEDGERNAME>${escapeXml(ledgerName)}</LEDGERNAME>`,
    '<ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>',
    '<ISPARTYLEDGER>Yes</ISPARTYLEDGER>',
    `<AMOUNT>${formatTallyNumber(amount)}</AMOUNT>`,
    '</ALLLEDGERENTRIES.LIST>',
  ].join('')
}

function salesInventoryEntry(item: TallySalesVoucherItem) {
  return [
    '<INVENTORYENTRIES.LIST>',
    `<STOCKITEMNAME>${escapeXml(item.name)}</STOCKITEMNAME>`,
    item.description ? `<BASICUSERDESCRIPTION.LIST TYPE="String"><BASICUSERDESCRIPTION>${escapeXml(item.description)}</BASICUSERDESCRIPTION></BASICUSERDESCRIPTION.LIST>` : '',
    item.hsnCode ? `<HSNCODE>${escapeXml(item.hsnCode)}</HSNCODE>` : '',
    '<ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>',
    `<RATE>${escapeXml(tallyRate(item.rate, item.unitName))}</RATE>`,
    `<AMOUNT>${formatTallyNumber(Math.abs(item.amount))}</AMOUNT>`,
    `<ACTUALQTY>${escapeXml(tallyQuantity(item.quantity, item.unitName))}</ACTUALQTY>`,
    `<BILLEDQTY>${escapeXml(tallyQuantity(item.quantity, item.unitName))}</BILLEDQTY>`,
    '<ACCOUNTINGALLOCATIONS.LIST>',
    '<LEDGERNAME>Sales</LEDGERNAME>',
    '<ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>',
    `<AMOUNT>${formatTallyNumber(Math.abs(item.amount))}</AMOUNT>`,
    '</ACCOUNTINGALLOCATIONS.LIST>',
    '</INVENTORYENTRIES.LIST>',
  ].join('')
}

function salesTaxLedgerEntry(ledgerName: string, amount: number) {
  const isPositive = amount >= 0
  return [
    '<ALLLEDGERENTRIES.LIST>',
    `<LEDGERNAME>${escapeXml(ledgerName)}</LEDGERNAME>`,
    `<ISDEEMEDPOSITIVE>${isPositive ? 'No' : 'Yes'}</ISDEEMEDPOSITIVE>`,
    `<AMOUNT>${formatTallyNumber(amount)}</AMOUNT>`,
    '</ALLLEDGERENTRIES.LIST>',
  ].join('')
}

function salesVoucherTaxLedgerLines(items: TallySalesVoucherItem[], isIgst: boolean) {
  const totalTax = roundTallyAmount(sumNumbers(items.map((item) => item.taxAmount)))
  if (totalTax === 0) return []
  if (isIgst) return [{ ledgerName: 'Output IGST', amount: totalTax }]
  return [
    { ledgerName: 'Output CGST', amount: roundTallyAmount(totalTax / 2) },
    { ledgerName: 'Output SGST', amount: roundTallyAmount(totalTax / 2) },
  ]
}

function gstRateDetail(head: string, rate: number) {
  return [
    '<RATEDETAILS.LIST>',
    `<GSTRATEDUTYHEAD>${escapeXml(head)}</GSTRATEDUTYHEAD>`,
    '<GSTRATEVALUATIONTYPE>Based on Value</GSTRATEVALUATIONTYPE>',
    `<GSTRATE>${formatTallyNumber(rate)}</GSTRATE>`,
    '</RATEDETAILS.LIST>',
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
  const attributeMatch = /<(?:COMPANY|LEDGER|STOCKITEM|UNIT|STOCKGROUP)\b[^>]*\bNAME="([^"]+)"/i.exec(xml)
  if (attributeMatch?.[1]?.trim()) return unescapeXml(attributeMatch[1].trim())
  const objectMatch = /<(?:COMPANY|LEDGER|STOCKITEM|UNIT|STOCKGROUP)\b[\s\S]*?<NAME(?:\s[^>]*)?>([\s\S]*?)<\/NAME>/i.exec(xml)
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
  return (value ?? '').trim().replace(/\s+/g, ' ').toLowerCase()
}

function xmlIncludesNormalized(xml: string, value: string) {
  return normalizeText(unescapeXml(xml)).includes(normalizeText(value))
}

function validTallyGstinOrUin(value: string) {
  return /^[0-9A-Z]{15}$/.test(value.trim().toUpperCase())
}

function salesItems(entry: AnyRow) {
  return Array.isArray(entry.items) ? entry.items as AnyRow[] : []
}

function salesItemLinks(entry: AnyRow, links: Map<string, TallySyncLink>) {
  const map = new Map<string, TallySyncLink>()
  for (const item of salesItems(entry)) {
    const productId = valueOrNull(item.product_id)
    if (!productId) continue
    const link = links.get(`products:${productId}`)
    if (link) map.set(productId, link)
  }
  return map
}

function salesItemTaxableAmount(item: AnyRow) {
  const explicitTaxable = numberValue(item.taxable_amount ?? item.taxableTotal ?? item.taxable_total)
  if (explicitTaxable > 0) return explicitTaxable
  const lineTotal = numberValue(item.line_total)
  const taxAmount = numberValue(item.tax_amount)
  if (lineTotal > 0) return Math.max(0, roundTallyAmount(lineTotal - taxAmount))
  return Math.max(0, roundTallyAmount(numberValue(item.quantity) * numberValue(item.rate) - numberValue(item.discount_amount)))
}

function tallyRate(rate: number, unitName: string | null) {
  return unitName ? `${formatTallyNumber(rate)}/${unitName}` : formatTallyNumber(rate)
}

function tallyQuantity(quantity: number, unitName: string | null) {
  return unitName ? `${formatTallyNumber(quantity)} ${unitName}` : formatTallyNumber(quantity)
}

function tallyDateFrom(value: unknown) {
  const raw = stringOrNull(value)
  const date = raw ? new Date(raw) : new Date()
  return Number.isNaN(date.getTime()) ? tallyDate() : tallyDate(date)
}

function numberValue(value: unknown) {
  const number = Number(value ?? 0)
  return Number.isFinite(number) ? number : 0
}

function sumNumbers(values: number[]) {
  return values.reduce((total, value) => total + numberValue(value), 0)
}

function roundTallyAmount(value: number) {
  return Number(numberValue(value).toFixed(2))
}

function formatTallyNumber(value: number) {
  return roundTallyAmount(value).toString()
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

function tallyDate(value = new Date()) {
  const year = value.getFullYear()
  const month = String(value.getMonth() + 1).padStart(2, '0')
  const day = String(value.getDate()).padStart(2, '0')
  return `${year}${month}${day}`
}

function dateString(value: Date | null) {
  return value ? value.toISOString() : null
}
