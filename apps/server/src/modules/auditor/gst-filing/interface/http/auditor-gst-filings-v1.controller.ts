import { Body, Headers, Param, Query } from '../../../../../core/decorators/http-params.js'
import { Controller, Get, Post } from '../../../../../core/decorators/controller.js'
import { Inject } from '../../../../../core/decorators/inject.js'
import type { TenantRequestHeaders } from '../../../../../core/tenant/tenant-context.service.js'
import { AuditorGstFilingService } from '../../application/auditor-gst-filing.service.js'
import type { AuditorGstFilingUpsertInput } from '../../domain/entities/auditor-gst-filing.entity.js'

@Controller('api/v1/auditor/gst-filings')
export class AuditorGstFilingsV1Controller {
  constructor(@Inject(AuditorGstFilingService) private readonly filings: AuditorGstFilingService) {}

  @Get()
  list(@Headers() headers: TenantRequestHeaders, @Query() query: Record<string, unknown>) {
    return this.filings.list(headers, query)
  }

  @Post('upsert')
  upsert(@Headers() headers: TenantRequestHeaders, @Body() body: AuditorGstFilingUpsertInput) {
    return this.filings.upsert(headers, body)
  }

  @Post(':idOrUuid/destroy')
  destroy(@Headers() headers: TenantRequestHeaders, @Param('idOrUuid') idOrUuid: string) {
    return this.filings.destroy(headers, idOrUuid)
  }
}
