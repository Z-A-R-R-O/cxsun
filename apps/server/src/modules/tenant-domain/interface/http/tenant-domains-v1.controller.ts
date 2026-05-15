import { Controller, Get, Post } from '../../../../core/decorators/controller.js'
import { Body, Headers, Query } from '../../../../core/decorators/http-params.js'
import { Inject } from '../../../../core/decorators/inject.js'
import { TenantDomainService } from '../../application/tenant-domain.service.js'
import type { TenantDomainUpsertInput } from '../../domain/tenant-domain.types.js'

@Controller('api/v1/tenant-domains')
export class TenantDomainsV1Controller {
  constructor(
    @Inject(TenantDomainService) private readonly tenantDomains: TenantDomainService,
  ) {}

  @Get()
  list() {
    return this.tenantDomains.list()
  }

  @Get('resolve')
  resolve(@Query('domain') domain: string | undefined, @Headers('host') host: string | string[] | undefined) {
    const fallbackHost = Array.isArray(host) ? host[0] : host
    return this.tenantDomains.resolve(domain || fallbackHost || '')
  }

  @Post('upsert')
  upsert(@Body() body: TenantDomainUpsertInput) {
    return this.tenantDomains.upsert(body)
  }
}
