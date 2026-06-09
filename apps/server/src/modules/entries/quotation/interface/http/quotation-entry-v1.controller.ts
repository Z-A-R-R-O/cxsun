import { Body, Headers, Param } from '../../../../../core/decorators/http-params.js'
import { Controller, Get, Post } from '../../../../../core/decorators/controller.js'
import { Inject } from '../../../../../core/decorators/inject.js'
import type { TenantRequestHeaders } from '../../../../../core/tenant/tenant-context.service.js'
import { QuotationEntryService } from '../../application/quotation-entry.service.js'
import type { QuotationEntryInput } from '../../infrastructure/persistence/quotation-entry.repository.js'

@Controller('api/v1/entries/quotation')
export class QuotationEntryV1Controller {
  constructor(@Inject(QuotationEntryService) private readonly quotationEntries: QuotationEntryService) {}

  @Get()
  list(@Headers() headers: TenantRequestHeaders) {
    return this.quotationEntries.list(headers)
  }

  @Get(':idOrUuid')
  get(@Headers() headers: TenantRequestHeaders, @Param('idOrUuid') idOrUuid: string) {
    return this.quotationEntries.get(headers, idOrUuid)
  }

  @Post('upsert')
  upsert(@Headers() headers: TenantRequestHeaders, @Body() body: QuotationEntryInput) {
    return this.quotationEntries.upsert(headers, body)
  }

  @Post('generate-invoice')
  generateInvoice(@Headers() headers: TenantRequestHeaders, @Body() body: { quotationIds?: unknown }) {
    return this.quotationEntries.generateInvoice(headers, body)
  }

  @Post(':idOrUuid/destroy')
  destroy(@Headers() headers: TenantRequestHeaders, @Param('idOrUuid') idOrUuid: string) {
    return this.quotationEntries.destroy(headers, idOrUuid)
  }

  @Post(':idOrUuid/restore')
  restore(@Headers() headers: TenantRequestHeaders, @Param('idOrUuid') idOrUuid: string) {
    return this.quotationEntries.restore(headers, idOrUuid)
  }

  @Post(':idOrUuid/comments')
  comment(
    @Headers() headers: TenantRequestHeaders,
    @Param('idOrUuid') idOrUuid: string,
    @Body() body: { body?: unknown },
  ) {
    return this.quotationEntries.comment(headers, idOrUuid, body)
  }

  @Post(':idOrUuid/tools')
  tool(
    @Headers() headers: TenantRequestHeaders,
    @Param('idOrUuid') idOrUuid: string,
    @Body() body: { printHtml?: unknown; tool?: unknown },
  ) {
    return this.quotationEntries.tool(headers, idOrUuid, body)
  }
}

