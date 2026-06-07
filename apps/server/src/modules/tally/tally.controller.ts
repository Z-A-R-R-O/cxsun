import { Body, Headers, Param, Query } from '../../core/decorators/http-params.js'
import { Controller, Get, Post } from '../../core/decorators/controller.js'
import { Inject } from '../../core/decorators/inject.js'
import type { TenantRequestHeaders } from '../../core/tenant/tenant-context.service.js'
import { TallyService } from './tally.service.js'
import type { TallySettingsInput, TallySyncActionInput, TallySyncJobInput } from './tally.types.js'

@Controller('api/v1/tally')
export class TallyController {
  constructor(@Inject(TallyService) private readonly tally: TallyService) {}

  @Get()
  workspace(@Headers() headers: TenantRequestHeaders) {
    return this.tally.workspace(headers)
  }

  @Post('settings')
  saveSettings(@Headers() headers: TenantRequestHeaders, @Body() body: TallySettingsInput) {
    return this.tally.saveSettings(headers, body)
  }

  @Post('validate-connection')
  validateConnection(@Headers() headers: TenantRequestHeaders, @Body() body: TallySettingsInput) {
    return this.tally.validateConnection(headers, body)
  }

  @Post('sync-jobs')
  createSyncJob(@Headers() headers: TenantRequestHeaders, @Body() body: TallySyncJobInput) {
    return this.tally.createJob(headers, body)
  }

  @Get('sync/:resource')
  syncList(
    @Headers() headers: TenantRequestHeaders,
    @Param('resource') resource: string,
    @Query() query: Record<string, unknown>,
  ) {
    return this.tally.syncList(headers, resource, query)
  }

  @Post('sync/:resource')
  syncRecords(
    @Headers() headers: TenantRequestHeaders,
    @Param('resource') resource: string,
    @Body() body: TallySyncActionInput,
  ) {
    return this.tally.syncRecords(headers, resource, body)
  }
}
