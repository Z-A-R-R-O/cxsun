import { type Kysely } from 'kysely'
import { BadRequestException } from '../../core/exceptions/http.exception.js'
import { Injectable } from '../../core/decorators/injectable.js'
import type { TenantRuntimeContext } from '../../core/tenant/tenant-context.service.js'
import { dispatchPublicUuid } from '../../shared/helpers/public-uuid.js'
import type { TallySettings, TallySettingsInput, TallySyncItem, TallySyncJob, TallySyncJobInput, TallySyncLink, TallyWorkspace } from './tally.types.js'

type DynamicDatabase = Record<string, Record<string, unknown>>

@Injectable()
export class TallyRepository {
  async workspace(context: TenantRuntimeContext): Promise<TallyWorkspace> {
    const settings = await this.settings(context)
    const jobs = await this.jobs(context)
    const latestJobId = jobs[0]?.id
    const items = latestJobId ? await this.items(context, latestJobId) : []
    return { settings, jobs, items }
  }

  async settings(context: TenantRuntimeContext): Promise<TallySettings> {
    const companyId = await this.defaultCompanyId(context)
    const row = await this.database(context)
      .selectFrom('tally_settings')
      .selectAll()
      .where('tenant_id', '=', context.tenant.id)
      .where((eb) => companyId ? eb('company_id', '=', companyId) : eb('company_id', 'is', null))
      .executeTakeFirst()
    if (row) return toSettings(row)

    await this.database(context).insertInto('tally_settings').values({
      uuid: dispatchPublicUuid(),
      tenant_id: context.tenant.id,
      company_id: companyId,
      enabled: false,
      tally_host: 'localhost',
      tally_port: 9000,
      sync_direction: 'export',
      settings: JSON.stringify({ voucher_mode: 'accounting', xml_version: 'tally-prime' }),
      updated_by: context.user.email,
      updated_at: new Date(),
    }).execute()
    return this.settings(context)
  }

  async saveSettings(context: TenantRuntimeContext, input: TallySettingsInput): Promise<TallySettings> {
    const current = await this.settings(context)
    const patch = {
      enabled: input.enabled === undefined ? current.enabled : Boolean(input.enabled),
      tally_host: input.tally_host === undefined ? current.tally_host : input.tally_host.trim() || 'localhost',
      tally_port: input.tally_port === undefined ? current.tally_port : numberValue(input.tally_port) || 9000,
      company_name: input.company_name === undefined ? current.company_name : emptyAsNull(input.company_name),
      sync_sales: input.sync_sales === undefined ? current.sync_sales : Boolean(input.sync_sales),
      sync_purchase: input.sync_purchase === undefined ? current.sync_purchase : Boolean(input.sync_purchase),
      sync_receipt: input.sync_receipt === undefined ? current.sync_receipt : Boolean(input.sync_receipt),
      sync_payment: input.sync_payment === undefined ? current.sync_payment : Boolean(input.sync_payment),
      sync_inventory: input.sync_inventory === undefined ? current.sync_inventory : Boolean(input.sync_inventory),
      sync_contacts: input.sync_contacts === undefined ? current.sync_contacts : Boolean(input.sync_contacts),
      sync_direction: input.sync_direction === undefined ? current.sync_direction : input.sync_direction.trim() || current.sync_direction || 'export',
      settings: mergeSettingsJson(current.settings, input.settings) ?? current.settings,
      updated_by: context.user.email,
      updated_at: new Date(),
    }
    await this.database(context).updateTable('tally_settings').set(patch).where('id', '=', current.id).execute()
    return this.settings(context)
  }

  async jobs(context: TenantRuntimeContext): Promise<TallySyncJob[]> {
    const rows = await this.database(context).selectFrom('tally_sync_jobs').selectAll().where('tenant_id', '=', context.tenant.id).orderBy('id', 'desc').limit(50).execute()
    return rows.map(toJob)
  }

  async items(context: TenantRuntimeContext, jobId: number): Promise<TallySyncItem[]> {
    const rows = await this.database(context).selectFrom('tally_sync_items').selectAll().where('job_id', '=', jobId).orderBy('id', 'asc').execute()
    return rows.map(toItem)
  }

  async createJob(context: TenantRuntimeContext, input: TallySyncJobInput): Promise<TallyWorkspace> {
    const settings = await this.settings(context)
    if (!settings.enabled) throw new BadRequestException('Enable Tally integration before creating a sync job.')
    if (!settings.company_name) throw new BadRequestException('Validate a Tally company handshake before creating a sync job.')
    const jobType = input.job_type?.trim() || 'single-operation'
    const direction = input.direction?.trim() || settings.sync_direction || 'export'
    await this.database(context).insertInto('tally_sync_jobs').values({
      uuid: dispatchPublicUuid(),
      tenant_id: context.tenant.id,
      company_id: settings.company_id,
      job_type: jobType,
      direction,
      status: 'queued',
      requested_by: context.user.email,
      total_records: 0,
      success_count: 0,
      failed_count: 0,
      payload: jsonOrNull(input.payload) ?? JSON.stringify({ modules: enabledModules(settings), requested_at: new Date().toISOString() }),
      updated_at: new Date(),
    }).execute()
    return this.workspace(context)
  }

  async syncLinks(context: TenantRuntimeContext, moduleKeys: string[] = []): Promise<TallySyncLink[]> {
    let query = this.database(context)
      .selectFrom('tally_sync_links')
      .selectAll()
      .where('tenant_id', '=', context.tenant.id)

    if (moduleKeys.length) {
      query = query.where('module_key', 'in', moduleKeys)
    }

    const rows = await query.orderBy('updated_at', 'desc').execute()
    return rows.map(toSyncLink)
  }

  async saveSyncLink(
    context: TenantRuntimeContext,
    input: {
      module_key: string
      record_type: string
      record_id?: string | null
      record_uuid: string
      record_label?: string | null
      classification?: string | null
      tally_name?: string | null
      tally_guid?: string | null
      status: string
      last_synced_at?: Date | null
      last_error?: string | null
      payload?: unknown
    },
  ) {
    const settings = await this.settings(context)
    const existing = await this.database(context)
      .selectFrom('tally_sync_links')
      .selectAll()
      .where('tenant_id', '=', context.tenant.id)
      .where('company_id', '=', settings.company_id)
      .where('module_key', '=', input.module_key)
      .where('record_uuid', '=', input.record_uuid)
      .executeTakeFirst()

    const patch = {
      company_id: settings.company_id,
      module_key: input.module_key,
      record_type: input.record_type,
      record_id: emptyAsNull(input.record_id),
      record_uuid: input.record_uuid,
      record_label: emptyAsNull(input.record_label),
      classification: emptyAsNull(input.classification),
      tally_name: emptyAsNull(input.tally_name),
      tally_guid: emptyAsNull(input.tally_guid),
      status: input.status,
      last_synced_at: input.last_synced_at ?? null,
      last_error: emptyAsNull(input.last_error),
      payload: jsonOrNull(input.payload),
      updated_by: context.user.email,
      updated_at: new Date(),
    }

    if (existing) {
      await this.database(context)
        .updateTable('tally_sync_links')
        .set(patch)
        .where('id', '=', Number(existing.id))
        .execute()
    } else {
      await this.database(context)
        .insertInto('tally_sync_links')
        .values({
          uuid: dispatchPublicUuid(),
          tenant_id: context.tenant.id,
          ...patch,
        })
        .execute()
    }

    const saved = await this.database(context)
      .selectFrom('tally_sync_links')
      .selectAll()
      .where('tenant_id', '=', context.tenant.id)
      .where('company_id', '=', settings.company_id)
      .where('module_key', '=', input.module_key)
      .where('record_uuid', '=', input.record_uuid)
      .executeTakeFirst()

    return saved ? toSyncLink(saved) : null
  }

  private async defaultCompanyId(context: TenantRuntimeContext) {
    const company = await this.database(context).selectFrom('companies').select('id').where('tenant_id', '=', context.tenant.id).where('is_primary', '=', true).executeTakeFirst()
    return Number(company?.id ?? 0) || null
  }

  private database(context: TenantRuntimeContext) {
    return context.database as unknown as Kysely<DynamicDatabase>
  }
}

function toSettings(row: Record<string, unknown>): TallySettings {
  return {
    id: Number(row.id),
    uuid: String(row.uuid),
    tenant_id: Number(row.tenant_id),
    company_id: numberOrNull(row.company_id),
    enabled: Boolean(row.enabled),
    tally_host: String(row.tally_host),
    tally_port: numberValue(row.tally_port),
    company_name: stringOrNull(row.company_name),
    sync_sales: Boolean(row.sync_sales),
    sync_purchase: Boolean(row.sync_purchase),
    sync_receipt: Boolean(row.sync_receipt),
    sync_payment: Boolean(row.sync_payment),
    sync_inventory: Boolean(row.sync_inventory),
    sync_contacts: Boolean(row.sync_contacts),
    sync_direction: String(row.sync_direction),
    settings: stringOrNull(row.settings),
    updated_by: stringOrNull(row.updated_by),
    created_at: row.created_at as Date,
    updated_at: row.updated_at as Date,
  }
}

function toJob(row: Record<string, unknown>): TallySyncJob {
  return {
    id: Number(row.id),
    uuid: String(row.uuid),
    tenant_id: Number(row.tenant_id),
    company_id: numberOrNull(row.company_id),
    job_type: String(row.job_type),
    direction: String(row.direction),
    status: String(row.status),
    requested_by: String(row.requested_by),
    started_at: row.started_at as Date | null,
    finished_at: row.finished_at as Date | null,
    total_records: numberValue(row.total_records),
    success_count: numberValue(row.success_count),
    failed_count: numberValue(row.failed_count),
    error_message: stringOrNull(row.error_message),
    payload: stringOrNull(row.payload),
    created_at: row.created_at as Date,
    updated_at: row.updated_at as Date,
  }
}

function toItem(row: Record<string, unknown>): TallySyncItem {
  return {
    id: Number(row.id),
    uuid: String(row.uuid),
    job_id: Number(row.job_id),
    module_key: String(row.module_key),
    record_id: stringOrNull(row.record_id),
    record_uuid: stringOrNull(row.record_uuid),
    record_label: stringOrNull(row.record_label),
    tally_guid: stringOrNull(row.tally_guid),
    status: String(row.status),
    error_message: stringOrNull(row.error_message),
    payload: stringOrNull(row.payload),
    created_at: row.created_at as Date,
    updated_at: row.updated_at as Date,
  }
}

function toSyncLink(row: Record<string, unknown>): TallySyncLink {
  return {
    id: Number(row.id),
    uuid: String(row.uuid),
    tenant_id: Number(row.tenant_id),
    company_id: numberOrNull(row.company_id),
    module_key: String(row.module_key),
    record_type: String(row.record_type),
    record_id: stringOrNull(row.record_id),
    record_uuid: String(row.record_uuid),
    record_label: stringOrNull(row.record_label),
    classification: stringOrNull(row.classification),
    tally_name: stringOrNull(row.tally_name),
    tally_guid: stringOrNull(row.tally_guid),
    status: String(row.status),
    last_synced_at: row.last_synced_at as Date | null,
    last_error: stringOrNull(row.last_error),
    payload: stringOrNull(row.payload),
    updated_by: stringOrNull(row.updated_by),
    created_at: row.created_at as Date,
    updated_at: row.updated_at as Date,
  }
}

function enabledModules(settings: TallySettings) {
  return [
    settings.sync_sales ? 'sales' : '',
    settings.sync_purchase ? 'purchase' : '',
    settings.sync_receipt ? 'receipt' : '',
    settings.sync_payment ? 'payment' : '',
    settings.sync_inventory ? 'inventory' : '',
    settings.sync_contacts ? 'contacts' : '',
  ].filter(Boolean)
}

function emptyAsNull(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function stringOrNull(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function numberValue(value: unknown) {
  const number = Number(value ?? 0)
  return Number.isFinite(number) ? number : 0
}

function numberOrNull(value: unknown) {
  const number = Number(value ?? 0)
  return Number.isFinite(number) && number > 0 ? number : null
}

function jsonOrNull(value: unknown) {
  if (value === null || value === undefined || value === '') return null
  if (typeof value !== 'string') return JSON.stringify(value)
  try {
    JSON.parse(value)
    return value
  } catch {
    return JSON.stringify(value)
  }
}

function mergeSettingsJson(currentValue: unknown, inputValue: unknown) {
  if (inputValue === undefined) return jsonOrNull(currentValue)
  if (inputValue === null || inputValue === '') return jsonOrNull(currentValue)
  if (typeof inputValue === 'string') return inputValue
  if (!inputValue || typeof inputValue !== 'object' || Array.isArray(inputValue)) return jsonOrNull(currentValue)
  return JSON.stringify({
    ...jsonObjectOrEmpty(currentValue),
    ...(inputValue as Record<string, unknown>),
  })
}

function jsonObjectOrEmpty(value: unknown) {
  if (typeof value !== 'string' || !value.trim()) return {}
  try {
    const parsed = JSON.parse(value) as unknown
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : {}
  } catch {
    return {}
  }
}
