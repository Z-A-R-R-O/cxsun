import { Body, Headers, Param } from '../../../../core/decorators/http-params.js'
import { Controller, Get, Post } from '../../../../core/decorators/controller.js'
import { Inject } from '../../../../core/decorators/inject.js'
import type { TenantRequestHeaders } from '../../../../core/tenant/tenant-context.service.js'
import { SalesAccountTypesCommonService } from './service.js'

@Controller('api/v1/common/salesAccountTypes')
export class SalesAccountTypesCommonV1Controller {
  constructor(@Inject(SalesAccountTypesCommonService) private readonly records: SalesAccountTypesCommonService) {}

  @Get('definition')
  definition() {
    return this.records.definitionMetadata()
  }

  @Get()
  list(@Headers() headers: TenantRequestHeaders) {
    return this.records.list(headers)
  }

  @Get(':idOrUuid')
  get(@Headers() headers: TenantRequestHeaders, @Param('idOrUuid') idOrUuid: string) {
    return this.records.get(headers, idOrUuid)
  }

  @Post('upsert')
  upsert(@Headers() headers: TenantRequestHeaders, @Body() body: Record<string, unknown>) {
    return this.records.upsert(headers, body)
  }

  @Post(':idOrUuid/destroy')
  destroy(@Headers() headers: TenantRequestHeaders, @Param('idOrUuid') idOrUuid: string) {
    return this.records.destroy(headers, idOrUuid)
  }

  @Post(':idOrUuid/restore')
  restore(@Headers() headers: TenantRequestHeaders, @Param('idOrUuid') idOrUuid: string) {
    return this.records.restore(headers, idOrUuid)
  }
}
