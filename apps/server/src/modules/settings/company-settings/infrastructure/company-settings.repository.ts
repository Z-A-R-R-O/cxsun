import { Inject } from '../../../../core/decorators/inject.js'
import { Injectable } from '../../../../core/decorators/injectable.js'
import { dispatchPublicUuid } from '../../../../shared/helpers/public-uuid.js'
import { TenantContextService, type TenantRequestHeaders, type TenantRuntimeContext } from '../../../../core/tenant/tenant-context.service.js'
import type { CompanySettingInput, CompanySettingKey, CompanySettingRecord } from '../domain/company-setting-record.js'

@Injectable()
export class CompanySettingsRepository {
  constructor(@Inject(TenantContextService) private readonly tenantContext: TenantContextService) {}

  async get(headers: TenantRequestHeaders, companyId: string, key: CompanySettingKey) {
    const context = await this.tenantContext.resolve(headers, 'company.manage')
    return this.findOrEmpty(context, companyId, key)
  }

  async save(headers: TenantRequestHeaders, companyId: string, key: CompanySettingKey, input: CompanySettingInput) {
    const context = await this.tenantContext.resolve(headers, 'company.manage')
    const safeCompanyId = await resolveCompanyId(context, companyId)
    const values = cleanValues(input.values)
    const existing = await context.database
      .selectFrom('company_settings')
      .select('id')
      .where('company_id', '=', safeCompanyId)
      .where('setting_key', '=', key)
      .executeTakeFirst()

    if (existing) {
      await context.database
        .updateTable('company_settings')
        .set({ values_json: JSON.stringify(values), updated_at: new Date() })
        .where('id', '=', existing.id)
        .execute()
    } else {
      await context.database
        .insertInto('company_settings')
        .values({
          uuid: dispatchPublicUuid(),
          company_id: safeCompanyId,
          setting_key: key,
          values_json: JSON.stringify(values),
        })
        .execute()
    }

    return this.findOrEmpty(context, String(safeCompanyId), key)
  }

  private async findOrEmpty(context: TenantRuntimeContext, companyId: string, key: CompanySettingKey): Promise<CompanySettingRecord> {
    const safeCompanyId = await resolveCompanyId(context, companyId)
    const row = await context.database
      .selectFrom('company_settings')
      .selectAll()
      .where('company_id', '=', safeCompanyId)
      .where('setting_key', '=', key)
      .executeTakeFirst()

    if (!row) {
      return { companyId: String(safeCompanyId), key, values: {}, updatedAt: new Date(0) }
    }

    return {
      companyId: String(safeCompanyId),
      key,
      values: parseValues(row.values_json),
      updatedAt: row.updated_at instanceof Date ? row.updated_at : new Date(row.updated_at),
    }
  }
}

async function resolveCompanyId(context: TenantRuntimeContext, value: string) {
  const numericValue = Number(value)
  if (Number.isInteger(numericValue) && numericValue > 0) return numericValue

  const row = await context.database
    .selectFrom('companies')
    .select('id')
    .where('deleted_at', 'is', null)
    .orderBy('is_primary', 'desc')
    .orderBy('id', 'asc')
    .executeTakeFirst()

  return row?.id ?? 0
}

function parseValues(value: unknown) {
  if (typeof value !== 'string') return {}
  try {
    return cleanValues(JSON.parse(value) as unknown)
  } catch {
    return {}
  }
}

function cleanValues(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
}

