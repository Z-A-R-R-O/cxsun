import { Body, Headers, Query, Param } from '../../../../../core/decorators/http-params.js'
import { Controller, Get, Patch } from '../../../../../core/decorators/controller.js'
import { Inject } from '../../../../../core/decorators/inject.js'
import type { TenantRequestHeaders } from '../../../../../core/tenant/tenant-context.service.js'
import { CompanySettingsService } from '../../application/company-settings.service.js'
import type { CompanySettingInput } from '../../domain/company-setting-record.js'

@Controller('api/v1/company-settings')
export class CompanySettingsV1Controller {
  constructor(@Inject(CompanySettingsService) private readonly settings: CompanySettingsService) {}

  @Get(':key')
  get(@Headers() headers: TenantRequestHeaders, @Param('key') key: string, @Query() query: Record<string, unknown>) {
    return this.settings.get(headers, key, query)
  }

  @Patch(':key')
  save(
    @Headers() headers: TenantRequestHeaders,
    @Param('key') key: string,
    @Query() query: Record<string, unknown>,
    @Body() body: CompanySettingInput,
  ) {
    return this.settings.save(headers, key, query, body)
  }
}

