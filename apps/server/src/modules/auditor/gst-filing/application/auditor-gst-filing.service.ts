import { Inject } from '../../../../core/decorators/inject.js'
import { Injectable } from '../../../../core/decorators/injectable.js'
import { NotFoundException } from '../../../../core/exceptions/http.exception.js'
import { TenantContextService, type TenantRequestHeaders, type TenantRuntimeContext } from '../../../../core/tenant/tenant-context.service.js'
import { AuditorGstFilingRepository } from '../infrastructure/persistence/auditor-gst-filing.repository.js'
import type { AuditorGstFilingRecord, AuditorGstFilingUpsertInput } from '../domain/entities/auditor-gst-filing.entity.js'
import { EntryPostingControlService } from '../../../entries/shared/entry-posting-control.service.js'

@Injectable()
export class AuditorGstFilingService {
  constructor(
    @Inject(() => TenantContextService) private readonly tenantContext: TenantContextService,
    @Inject(AuditorGstFilingRepository) private readonly filings: AuditorGstFilingRepository,
    @Inject(EntryPostingControlService) private readonly postingControl: EntryPostingControlService,
  ) {}

  async list(headers: TenantRequestHeaders, query: Record<string, unknown>) {
    const context = await this.tenantContext.resolve(headers, 'company.manage')
    return this.filings.list(context, {
      accountingYearName: stringQuery(query.accountingYearName ?? query.accounting_year_name),
      contactId: numberQuery(query.contactId ?? query.contact_id),
      monthName: stringQuery(query.monthName ?? query.month_name),
    })
  }

  async upsert(headers: TenantRequestHeaders, input: AuditorGstFilingUpsertInput) {
    const context = await this.tenantContext.resolve(headers, 'company.manage')
    const record = await this.filings.upsert(context, input)
    if (!record) throw new NotFoundException('GST filing entry was not found.')
    await this.createMonthlyLockForCompletedFiling(context, record)
    return { ok: true, record }
  }

  async destroy(headers: TenantRequestHeaders, idOrUuid: string) {
    const context = await this.tenantContext.resolve(headers, 'company.manage')
    return { ok: Boolean(await this.filings.softDelete(context, idOrUuid)) }
  }

  private async createMonthlyLockForCompletedFiling(context: TenantRuntimeContext, record: AuditorGstFilingRecord) {
    if (!isCompletedFiling(record)) return
    const period = await filingPeriod(context, record)
    if (!period) return
    await this.postingControl.createPeriodLock(context, {
      accounting_year_id: period.accountingYearId,
      company_id: period.companyId,
      locked_from: period.lockedFrom,
      locked_to: period.lockedTo,
      lock_type: 'monthly_gst',
      source: 'gst_filing',
      reason: `GST filing completed for ${record.month_name} ${record.accounting_year_name}.`,
    })
  }
}

function stringQuery(value: unknown) {
  return value === null || value === undefined || value === '' ? undefined : String(value)
}

function numberQuery(value: unknown) {
  const numberValue = Number(value ?? 0)
  return Number.isFinite(numberValue) && numberValue > 0 ? numberValue : undefined
}

function isCompletedFiling(record: AuditorGstFilingRecord) {
  const status = String(record.status ?? '').trim().toLowerCase()
  if (['filed', 'finished', 'completed', 'complete', 'done', 'locked'].includes(status)) return true
  return Boolean(record.gstr1_arn || record.gstr3b_arn)
}

async function filingPeriod(context: TenantRuntimeContext, record: AuditorGstFilingRecord) {
  const defaultContext = await context.database
    .selectFrom('default_companies')
    .select(['company_id', 'accounting_year_id'])
    .where('is_active', '=', true)
    .orderBy('id', 'asc')
    .executeTakeFirst()
  const companyId = Number(defaultContext?.company_id ?? 0) || await primaryCompanyId(context)
  const accountingYearId = Number(record.accounting_year_id ?? defaultContext?.accounting_year_id ?? 0) || await activeAccountingYearId(context)
  const monthIndex = monthIndexFromName(record.month_name)
  if (monthIndex < 0) return null
  const year = yearForFilingMonth(record, monthIndex)
  if (!year) return null
  const lockedFrom = `${year}-${String(monthIndex + 1).padStart(2, '0')}-01`
  const lockedTo = new Date(Date.UTC(year, monthIndex + 1, 0)).toISOString().slice(0, 10)
  return { accountingYearId: accountingYearId || null, companyId: companyId || null, lockedFrom, lockedTo }
}

async function primaryCompanyId(context: TenantRuntimeContext) {
  const company = await context.database.selectFrom('companies').select('id').where('tenant_id', '=', context.tenant.id).where('is_primary', '=', true).executeTakeFirst()
  return Number(company?.id ?? 0)
}

async function activeAccountingYearId(context: TenantRuntimeContext) {
  const year = await context.database.selectFrom('accounting_years').select('id').where('is_active', '=', true).orderBy('start_date', 'desc').executeTakeFirst()
  return Number(year?.id ?? 0)
}

function monthIndexFromName(value: string) {
  const token = String(value ?? '').trim().slice(0, 3).toLowerCase()
  return ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'].indexOf(token)
}

function yearForFilingMonth(record: AuditorGstFilingRecord, monthIndex: number) {
  const monthYear = String(record.month_name ?? '').match(/\b(20\d{2}|19\d{2})\b/)
  if (monthYear) return Number(monthYear[1])
  const years = String(record.accounting_year_name ?? '').match(/\d{4}|\d{2}/g) ?? []
  const startYear = Number(years[0] ?? 0)
  if (!startYear) return null
  const endYear = years[1] && years[1].length === 2 ? Number(`${String(startYear).slice(0, 2)}${years[1]}`) : Number(years[1] ?? startYear + 1)
  return monthIndex >= 3 ? startYear : endYear
}
