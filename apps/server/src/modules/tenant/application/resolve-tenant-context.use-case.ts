import { Inject } from '../../../core/decorators/inject.js'
import { Injectable } from '../../../core/decorators/injectable.js'
import { getTenantDatabase } from '../../../infrastructure/tenant-database/tenant-database.connection.js'
import { TenantRepository } from '../infrastructure/tenant.repository.js'

export interface TenantContextResult {
  ok: boolean
  error?: string
  context?: {
    tenant: {
      id: number
      code: number
      slug: string
      name: string
      status: string
    industryId: number | null
      industry: {
        id: number
        code: string
        name: string
        defaultFeatures: string[]
        defaultUiSettings: Record<string, unknown>
      } | null
    }
    database: {
      type: 'mariadb'
      host: string
      port: number
      name: string
      ready: boolean
      error?: string
    }
    settings: Record<string, unknown>
    policies: string[]
    companies: {
      id: number
      name: string
      status: string
      settings: Record<string, unknown>
      features: string[]
    }[]
  }
}

@Injectable()
export class ResolveTenantContextUseCase {
  constructor(
    @Inject(TenantRepository) private readonly tenants: TenantRepository,
  ) {}

  async execute(tenantCode?: string | string[]): Promise<TenantContextResult> {
    const requestedTenant = Array.isArray(tenantCode) ? tenantCode[0] : tenantCode
    const tenant = await this.tenants.findForResolution(requestedTenant ?? 'tenant_1')

    if (!tenant) {
      return { ok: false, error: 'Tenant context was not found.' }
    }

    const policies = await this.tenants.listEnabledPolicyCodes(tenant.id)
    const industry = tenant.industry_id
      ? await this.tenants.findIndustryById(tenant.industry_id)
      : undefined
    const companies: NonNullable<TenantContextResult['context']>['companies'] = []
    let ready = false
    let databaseError: string | undefined

    try {
      const tenantDatabase = getTenantDatabase(tenant)
      const companyRows = await tenantDatabase
        .selectFrom('companies')
        .select(['id', 'name', 'status', 'settings', 'features', 'deleted_at'])
        .execute()

      ready = true
      companies.push(...companyRows.filter((company) => isEmptyDeletedAt(company.deleted_at)).map((company) => ({
          id: company.id,
          name: company.name,
          status: company.status,
          settings: parseJsonObject(company.settings),
          features: parseJsonArray(company.features),
        })))
    } catch (error) {
      databaseError = error instanceof Error ? error.message : 'Tenant database is not ready.'
    }

    return {
      ok: true,
      context: {
        tenant: {
          id: tenant.id,
          code: tenant.code,
          slug: tenant.slug,
          name: tenant.name,
          status: tenant.status,
          industryId: tenant.industry_id,
          industry: industry
            ? {
                id: industry.id,
                code: industry.code,
                name: industry.name,
                defaultFeatures: parseJsonArray(industry.default_features),
                defaultUiSettings: parseJsonObject(industry.default_ui_settings),
              }
            : null,
        },
        database: {
          type: 'mariadb',
          host: tenant.db_host,
          port: tenant.db_port,
          name: tenant.db_name,
          ready,
          error: databaseError,
        },
        settings: parseJsonObject(tenant.payload_settings),
        policies,
        companies,
      },
    }
  }
}

function parseJsonObject(value: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(value) as unknown
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : {}
  } catch {
    return {}
  }
}

function parseJsonArray(value: string): string[] {
  try {
    const parsed = JSON.parse(value) as unknown
    return Array.isArray(parsed) ? parsed.map(String) : []
  } catch {
    return []
  }
}

function isEmptyDeletedAt(value: Date | null | undefined) {
  return !value || Number.isNaN(value.getTime())
}
