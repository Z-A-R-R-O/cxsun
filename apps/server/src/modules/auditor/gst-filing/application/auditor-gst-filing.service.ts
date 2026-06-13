import { Inject } from '../../../../core/decorators/inject.js'
import { Injectable } from '../../../../core/decorators/injectable.js'
import { NotFoundException } from '../../../../core/exceptions/http.exception.js'
import { TenantContextService, type TenantRequestHeaders } from '../../../../core/tenant/tenant-context.service.js'
import { AuditorGstFilingRepository } from '../infrastructure/persistence/auditor-gst-filing.repository.js'
import type { AuditorGstFilingUpsertInput } from '../domain/entities/auditor-gst-filing.entity.js'

@Injectable()
export class AuditorGstFilingService {
  constructor(
    @Inject(() => TenantContextService) private readonly tenantContext: TenantContextService,
    @Inject(AuditorGstFilingRepository) private readonly filings: AuditorGstFilingRepository,
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
    return { ok: true, record }
  }

  async destroy(headers: TenantRequestHeaders, idOrUuid: string) {
    const context = await this.tenantContext.resolve(headers, 'company.manage')
    return { ok: Boolean(await this.filings.softDelete(context, idOrUuid)) }
  }
}

function stringQuery(value: unknown) {
  return value === null || value === undefined || value === '' ? undefined : String(value)
}

function numberQuery(value: unknown) {
  const numberValue = Number(value ?? 0)
  return Number.isFinite(numberValue) && numberValue > 0 ? numberValue : undefined
}
