import { sql, type Kysely } from 'kysely'
import { Injectable } from '../../../core/decorators/injectable.js'
import { BadRequestException } from '../../../core/exceptions/http.exception.js'
import type { TenantRuntimeContext } from '../../../core/tenant/tenant-context.service.js'

type DynamicDatabase = Record<string, Record<string, unknown>>

export interface EntryPeriodContext {
  accountingYearId?: number | string | null
  companyId?: number | string | null
  documentDate?: Date | string | null
  documentNo?: string | null
  module: string
}

export interface PostedEntryContext extends EntryPeriodContext {
  status?: string | null
}

export interface PeriodLockInput {
  accounting_year_id?: number | string | null
  company_id?: number | string | null
  locked_from?: Date | string | null
  locked_to?: Date | string | null
  lock_type?: string | null
  source?: string | null
  reason?: string | null
}

@Injectable()
export class EntryPostingControlService {
  async assertCanChangePosted(context: TenantRuntimeContext, entry: PostedEntryContext, action: 'delete' | 'restore' | 'update') {
    await this.assertPeriodOpen(context, entry)
    if (String(entry.status ?? '').toLowerCase() !== 'posted') return
    if (action === 'update') {
      throw new BadRequestException(`Posted ${entry.module} ${entry.documentNo ?? 'document'} cannot be changed directly. Create a correction voucher instead.`)
    }
    throw new BadRequestException(`Posted ${entry.module} ${entry.documentNo ?? 'document'} cannot be ${action === 'delete' ? 'suspended' : 'restored'} directly. Create a reversal voucher instead.`)
  }

  async assertPeriodOpen(context: TenantRuntimeContext, entry: EntryPeriodContext) {
    const documentDate = dateOnly(entry.documentDate)
    if (!documentDate) return
    const companyId = Number(entry.companyId ?? 0)
    const accountingYearId = Number(entry.accountingYearId ?? 0)
    const lock = await this.database(context)
      .selectFrom('accounting_period_locks')
      .select(['lock_type', 'reason', 'source'])
      .where('tenant_id', '=', context.tenant.id)
      .where('is_active', '=', true)
      .where('locked_from', '<=', documentDate)
      .where('locked_to', '>=', documentDate)
      .where((expression) => expression.or([
        expression('company_id', 'is', null),
        expression('company_id', '=', companyId),
      ]))
      .where((expression) => expression.or([
        expression('accounting_year_id', 'is', null),
        expression('accounting_year_id', '=', accountingYearId),
      ]))
      .orderBy('id', 'desc')
      .executeTakeFirst()
    if (!lock) return
    throw new BadRequestException(`Period is locked for ${entry.module} ${entry.documentNo ?? 'document'} (${documentDate}). Use reversal/correction flow. Reason: ${stringValue(lock.reason) || stringValue(lock.lock_type) || stringValue(lock.source) || 'period locked'}.`)
  }

  async recordCorrectionActivity(context: TenantRuntimeContext, input: { action: 'correction' | 'reversal'; correctedUuid?: string | null; module: string; originalUuid: string; reversalUuid?: string | null }) {
    await this.database(context)
      .insertInto('entry_correction_audit')
      .values({
        uuid: publicUuid(),
        tenant_id: context.tenant.id,
        module: input.module,
        original_uuid: input.originalUuid,
        reversal_uuid: input.reversalUuid ?? null,
        corrected_uuid: input.correctedUuid ?? null,
        action: input.action,
        actor_email: context.user.email,
        reason: input.action === 'reversal' ? 'Posted document reversal' : 'Posted document correction copy',
      })
      .execute()
  }

  async listPeriodLocks(context: TenantRuntimeContext) {
    return this.database(context)
      .selectFrom('accounting_period_locks')
      .selectAll()
      .where('tenant_id', '=', context.tenant.id)
      .orderBy('is_active', 'desc')
      .orderBy('locked_from', 'desc')
      .orderBy('id', 'desc')
      .execute()
  }

  async createPeriodLock(context: TenantRuntimeContext, input: PeriodLockInput = {}) {
    const lockedFrom = dateOnly(input.locked_from)
    const lockedTo = dateOnly(input.locked_to)
    if (!lockedFrom || !lockedTo) throw new BadRequestException('Locked from and locked to dates are required.')
    if (lockedFrom > lockedTo) throw new BadRequestException('Locked from date cannot be after locked to date.')
    const lockType = stringValue(input.lock_type) || 'audit'
    const companyId = positiveNumberOrNull(input.company_id)
    const accountingYearId = positiveNumberOrNull(input.accounting_year_id)
    const source = stringValue(input.source) || null
    const existing = await this.database(context)
      .selectFrom('accounting_period_locks')
      .selectAll()
      .where('tenant_id', '=', context.tenant.id)
      .where('locked_from', '=', lockedFrom)
      .where('locked_to', '=', lockedTo)
      .where('lock_type', '=', lockType)
      .where('is_active', '=', true)
      .where((expression) => companyId ? expression('company_id', '=', companyId) : expression('company_id', 'is', null))
      .where((expression) => accountingYearId ? expression('accounting_year_id', '=', accountingYearId) : expression('accounting_year_id', 'is', null))
      .where((expression) => source ? expression('source', '=', source) : expression('source', 'is', null))
      .executeTakeFirst()
    if (existing) return existing
    const result = await this.database(context)
      .insertInto('accounting_period_locks')
      .values({
        uuid: publicUuid(),
        tenant_id: context.tenant.id,
        company_id: companyId,
        accounting_year_id: accountingYearId,
        locked_from: lockedFrom,
        locked_to: lockedTo,
        lock_type: lockType,
        source,
        reason: stringValue(input.reason) || null,
        is_active: true,
        created_by: context.user.email,
      })
      .executeTakeFirst()
    return this.findPeriodLock(context, Number(result.insertId))
  }

  async releasePeriodLock(context: TenantRuntimeContext, idOrUuid: string) {
    const lock = await this.findPeriodLock(context, idOrUuid)
    if (!lock) throw new BadRequestException('Period lock not found.')
    await this.database(context)
      .updateTable('accounting_period_locks')
      .set({
        is_active: false,
        released_by: context.user.email,
        released_at: sql`CURRENT_TIMESTAMP`,
      })
      .where('tenant_id', '=', context.tenant.id)
      .where('id', '=', Number(lock.id))
      .execute()
    return this.findPeriodLock(context, Number(lock.id))
  }

  private async findPeriodLock(context: TenantRuntimeContext, idOrUuid: number | string) {
    const text = String(idOrUuid).trim()
    const id = Number(text)
    let query = this.database(context)
      .selectFrom('accounting_period_locks')
      .selectAll()
      .where('tenant_id', '=', context.tenant.id)

    query = Number.isInteger(id) && id > 0 ? query.where('id', '=', id) : query.where('uuid', '=', text)
    return query.executeTakeFirst()
  }

  private database(context: TenantRuntimeContext) {
    return context.database as unknown as Kysely<DynamicDatabase>
  }
}

export async function migrateEntryPostingControlTables(database: Kysely<DynamicDatabase>) {
  await sql`
    CREATE TABLE IF NOT EXISTS accounting_period_locks (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      uuid VARCHAR(80) NOT NULL,
      tenant_id BIGINT UNSIGNED NOT NULL,
      company_id BIGINT UNSIGNED NULL,
      accounting_year_id BIGINT UNSIGNED NULL,
      locked_from DATE NOT NULL,
      locked_to DATE NOT NULL,
      lock_type VARCHAR(40) NOT NULL DEFAULT 'audit',
      source VARCHAR(80) NULL,
      reason TEXT NULL,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_by VARCHAR(180) NOT NULL,
      released_by VARCHAR(180) NULL,
      released_at DATETIME NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_accounting_period_locks_range (tenant_id, company_id, accounting_year_id, locked_from, locked_to, is_active)
    )
  `.execute(database)

  await sql`
    CREATE TABLE IF NOT EXISTS entry_correction_audit (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      uuid VARCHAR(80) NOT NULL,
      tenant_id BIGINT UNSIGNED NOT NULL,
      module VARCHAR(40) NOT NULL,
      original_uuid VARCHAR(80) NOT NULL,
      reversal_uuid VARCHAR(80) NULL,
      corrected_uuid VARCHAR(80) NULL,
      action VARCHAR(40) NOT NULL,
      actor_email VARCHAR(180) NOT NULL,
      reason TEXT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_entry_correction_audit_original (tenant_id, module, original_uuid, id)
    )
  `.execute(database)
}

function dateOnly(value: Date | string | null | undefined) {
  if (!value) return null
  if (value instanceof Date) return value.toISOString().slice(0, 10)
  const text = String(value).trim()
  return text ? text.slice(0, 10) : null
}

function publicUuid() {
  return Math.random().toString(36).slice(2, 10).toUpperCase()
}

function stringValue(value: unknown) {
  return typeof value === 'string' ? value.trim() : value === null || value === undefined ? '' : String(value).trim()
}

function positiveNumberOrNull(value: unknown) {
  const number = Number(value ?? 0)
  return Number.isInteger(number) && number > 0 ? number : null
}
