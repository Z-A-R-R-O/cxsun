import { Body, Headers, Param } from '../../../../../core/decorators/http-params.js'
import { Controller, Get, Post } from '../../../../../core/decorators/controller.js'
import { Inject } from '../../../../../core/decorators/inject.js'
import type { TenantRequestHeaders } from '../../../../../core/tenant/tenant-context.service.js'
import { ExportSalesEntryService } from '../../application/export-sales-entry.service.js'
import type { ExportSalesEntryInput } from '../../infrastructure/persistence/export-sales-entry.repository.js'

@Controller('api/v1/entries/export-sales')
export class ExportSalesEntryV1Controller {
  constructor(@Inject(ExportSalesEntryService) private readonly exportSalesEntries: ExportSalesEntryService) {}

  @Get()
  list(@Headers() headers: TenantRequestHeaders) {
    return this.exportSalesEntries.list(headers)
  }

  @Get(':idOrUuid')
  get(@Headers() headers: TenantRequestHeaders, @Param('idOrUuid') idOrUuid: string) {
    return this.exportSalesEntries.get(headers, idOrUuid)
  }

  @Post('upsert')
  upsert(@Headers() headers: TenantRequestHeaders, @Body() body: ExportSalesEntryInput) {
    return this.exportSalesEntries.upsert(headers, body)
  }

  @Post(':idOrUuid/destroy')
  destroy(@Headers() headers: TenantRequestHeaders, @Param('idOrUuid') idOrUuid: string) {
    return this.exportSalesEntries.destroy(headers, idOrUuid)
  }

  @Post(':idOrUuid/restore')
  restore(@Headers() headers: TenantRequestHeaders, @Param('idOrUuid') idOrUuid: string) {
    return this.exportSalesEntries.restore(headers, idOrUuid)
  }

  @Post(':idOrUuid/comments')
  comment(
    @Headers() headers: TenantRequestHeaders,
    @Param('idOrUuid') idOrUuid: string,
    @Body() body: { body?: unknown },
  ) {
    return this.exportSalesEntries.comment(headers, idOrUuid, body)
  }

  @Post(':idOrUuid/tools')
  tool(
    @Headers() headers: TenantRequestHeaders,
    @Param('idOrUuid') idOrUuid: string,
    @Body() body: { printHtml?: unknown; tool?: unknown },
  ) {
    return this.exportSalesEntries.tool(headers, idOrUuid, body)
  }
}




