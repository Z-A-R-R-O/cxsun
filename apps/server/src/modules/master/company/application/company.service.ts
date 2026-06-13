import { Inject } from '../../../../core/decorators/inject.js'
import { Injectable } from '../../../../core/decorators/injectable.js'
import { NotFoundException } from '../../../../core/exceptions/http.exception.js'
import { TenantContextService, type TenantRequestHeaders } from '../../../../core/tenant/tenant-context.service.js'
import { CompanyAggregate, CompanyValidationError } from '../domain/company.aggregate.js'
import type { CompanyUpsertInput } from '../domain/company.types.js'
import { CompanyRepository } from '../infrastructure/company.repository.js'

@Injectable()
export class CompanyService {
  constructor(
    @Inject(() => TenantContextService) private readonly tenantContext: TenantContextService,
    @Inject(CompanyRepository) private readonly companies: CompanyRepository,
  ) {}

  async list(headers: TenantRequestHeaders) {
    const context = await this.tenantContext.resolve(headers, 'company.manage')
    return this.companies.list(context)
  }

  async defaultContext(headers: TenantRequestHeaders) {
    const context = await this.tenantContext.resolve(headers, 'company.manage')
    return this.companies.defaultContext(context)
  }

  async setDefaultContext(headers: TenantRequestHeaders, input: { companyId: number; accountingYearId: number; landingApp?: string }) {
    const context = await this.tenantContext.resolve(headers, 'company.manage')
    const result = await this.companies.setDefaultContext(context, input)
    return result ? { ok: true, context: result } : { ok: false, error: 'Company or accounting year was not found.' }
  }

  async get(headers: TenantRequestHeaders, id: number) {
    const context = await this.tenantContext.resolve(headers, 'company.manage')
    const company = await this.companies.findById(context, id)

    if (!company) {
      throw new NotFoundException('Company was not found.')
    }

    return company
  }

  async upsert(headers: TenantRequestHeaders, input: CompanyUpsertInput) {
    const context = await this.tenantContext.resolve(headers, 'company.manage')

    try {
      const data = CompanyAggregate.normalize(input)

      if (input.id) {
        const existing = await this.companies.findById(context, input.id)

        if (!existing) {
          throw new NotFoundException('Company was not found.')
        }

        return { ok: true, company: await this.companies.update(context, input.id, data) }
      }

      return { ok: true, company: await this.companies.insert(context, data) }
    } catch (error) {
      if (error instanceof CompanyValidationError) {
        return { ok: false, error: error.message }
      }

      throw error
    }
  }

  async destroy(headers: TenantRequestHeaders, id: number) {
    const context = await this.tenantContext.resolve(headers, 'company.manage')
    const destroyed = await this.companies.softDelete(context, id)
    return destroyed ? { ok: true } : { ok: false, error: 'Company was not found.' }
  }

  async restore(headers: TenantRequestHeaders, id: number) {
    const context = await this.tenantContext.resolve(headers, 'company.manage')
    const restored = await this.companies.restore(context, id)
    return restored ? { ok: true } : { ok: false, error: 'Company was not found.' }
  }
}
