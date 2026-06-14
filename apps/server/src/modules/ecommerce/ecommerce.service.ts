import { Inject } from '../../core/decorators/inject.js'
import { Injectable } from '../../core/decorators/injectable.js'
import { TenantContextService, type TenantRequestHeaders } from '../../core/tenant/tenant-context.service.js'
import { EcommerceRepository } from './ecommerce.repository.js'
import type { EcommerceCustomerInput, EcommerceProductInput, EcommerceSettingsInput } from './ecommerce.types.js'

@Injectable()
export class EcommerceService {
  constructor(
    @Inject(() => TenantContextService) private readonly tenants: TenantContextService,
    @Inject(EcommerceRepository) private readonly ecommerce: EcommerceRepository,
  ) {}

  async workspace(headers: TenantRequestHeaders) {
    const context = await this.tenants.resolve(headers, 'company.manage')
    return this.ecommerce.workspace(context)
  }

  async saveSettings(headers: TenantRequestHeaders, input: EcommerceSettingsInput) {
    const context = await this.tenants.resolve(headers, 'company.manage')
    return { ok: true, workspace: await this.ecommerce.saveSettings(context, input ?? {}) }
  }

  async upsertProduct(headers: TenantRequestHeaders, input: EcommerceProductInput) {
    const context = await this.tenants.resolve(headers, 'company.manage')
    return { ok: true, workspace: await this.ecommerce.upsertProduct(context, input ?? {}) }
  }

  async upsertCustomer(headers: TenantRequestHeaders, input: EcommerceCustomerInput) {
    const context = await this.tenants.resolve(headers, 'company.manage')
    return { ok: true, workspace: await this.ecommerce.upsertCustomer(context, input ?? {}) }
  }
}
