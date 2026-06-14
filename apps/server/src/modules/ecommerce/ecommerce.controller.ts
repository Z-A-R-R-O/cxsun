import { Body, Headers } from '../../core/decorators/http-params.js'
import { Controller, Get, Patch, Post } from '../../core/decorators/controller.js'
import { Inject } from '../../core/decorators/inject.js'
import type { TenantRequestHeaders } from '../../core/tenant/tenant-context.service.js'
import { EcommerceService } from './ecommerce.service.js'
import type { EcommerceCustomerInput, EcommerceProductInput, EcommerceSettingsInput } from './ecommerce.types.js'

@Controller('api/v1/ecommerce')
export class EcommerceController {
  constructor(@Inject(EcommerceService) private readonly ecommerce: EcommerceService) {}

  @Get()
  workspace(@Headers() headers: TenantRequestHeaders) {
    return this.ecommerce.workspace(headers)
  }

  @Get('dashboard')
  dashboard(@Headers() headers: TenantRequestHeaders) {
    return this.ecommerce.workspace(headers)
  }

  @Patch('settings')
  saveSettings(@Headers() headers: TenantRequestHeaders, @Body() body: EcommerceSettingsInput) {
    return this.ecommerce.saveSettings(headers, body)
  }

  @Post('products/upsert')
  upsertProduct(@Headers() headers: TenantRequestHeaders, @Body() body: EcommerceProductInput) {
    return this.ecommerce.upsertProduct(headers, body)
  }

  @Post('customers/upsert')
  upsertCustomer(@Headers() headers: TenantRequestHeaders, @Body() body: EcommerceCustomerInput) {
    return this.ecommerce.upsertCustomer(headers, body)
  }
}
