import { Body, Headers, Param } from '../../../../core/decorators/http-params.js'
import { Controller, Get, Post } from '../../../../core/decorators/controller.js'
import { Inject } from '../../../../core/decorators/inject.js'
import type { TenantRequestHeaders } from '../../../../core/tenant/tenant-context.service.js'
import type { CompanyUpsertInput } from '../../domain/company.types.js'
import { CompanyService } from '../../application/company.service.js'

@Controller('api/v1/companies')
export class CompaniesV1Controller {
  constructor(
    @Inject(CompanyService) private readonly companyService: CompanyService,
  ) {}

  @Get()
  async list(@Headers() headers: TenantRequestHeaders) {
    return this.companyService.list(headers)
  }

  @Post('upsert')
  async upsert(@Headers() headers: TenantRequestHeaders, @Body() body: CompanyUpsertInput) {
    return this.companyService.upsert(headers, body)
  }

  @Post(':id/destroy')
  async destroy(@Headers() headers: TenantRequestHeaders, @Param('id') id: string) {
    return this.companyService.destroy(headers, Number(id))
  }

  @Post(':id/restore')
  async restore(@Headers() headers: TenantRequestHeaders, @Param('id') id: string) {
    return this.companyService.restore(headers, Number(id))
  }
}

