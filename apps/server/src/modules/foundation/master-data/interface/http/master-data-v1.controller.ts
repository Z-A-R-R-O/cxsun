import { Body, Headers, Param, Query } from '../../../../../core/decorators/http-params.js'
import { Controller, Get, Post } from '../../../../../core/decorators/controller.js'
import { Inject } from '../../../../../core/decorators/inject.js'
import type { TenantRequestHeaders } from '../../../../../core/tenant/tenant-context.service.js'
import { MasterDataService } from '../../application/master-data.service.js'

@Controller('api/v1/master-data')
export class MasterDataV1Controller {
  constructor(
    @Inject(MasterDataService) private readonly masterData: MasterDataService,
  ) {}

  @Get('modules')
  modules(@Query('kind') kind?: string) {
    return this.masterData.modules(kind)
  }

  @Get('events')
  events() {
    return this.masterData.events()
  }

  @Get(':moduleKey')
  list(@Headers() headers: TenantRequestHeaders, @Param('moduleKey') moduleKey: string) {
    return this.masterData.list(headers, moduleKey)
  }

  @Get(':moduleKey/:idOrUuid')
  get(
    @Headers() headers: TenantRequestHeaders,
    @Param('moduleKey') moduleKey: string,
    @Param('idOrUuid') idOrUuid: string,
  ) {
    return this.masterData.get(headers, moduleKey, idOrUuid)
  }

  @Post(':moduleKey/upsert')
  upsert(
    @Headers() headers: TenantRequestHeaders,
    @Param('moduleKey') moduleKey: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.masterData.upsert(headers, moduleKey, body)
  }

  @Post(':moduleKey/:idOrUuid/destroy')
  destroy(
    @Headers() headers: TenantRequestHeaders,
    @Param('moduleKey') moduleKey: string,
    @Param('idOrUuid') idOrUuid: string,
  ) {
    return this.masterData.destroy(headers, moduleKey, idOrUuid)
  }

  @Post(':moduleKey/:idOrUuid/restore')
  restore(
    @Headers() headers: TenantRequestHeaders,
    @Param('moduleKey') moduleKey: string,
    @Param('idOrUuid') idOrUuid: string,
  ) {
    return this.masterData.restore(headers, moduleKey, idOrUuid)
  }
}

