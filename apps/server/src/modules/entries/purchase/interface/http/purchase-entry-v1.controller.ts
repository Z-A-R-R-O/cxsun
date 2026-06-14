import type { FastifyReply } from 'fastify'
import { Body, Headers, Param, Res } from '../../../../../core/decorators/http-params.js'
import { Controller, Get, Post } from '../../../../../core/decorators/controller.js'
import { Inject } from '../../../../../core/decorators/inject.js'
import type { TenantRequestHeaders } from '../../../../../core/tenant/tenant-context.service.js'
import { PurchaseEntryService } from '../../application/purchase-entry.service.js'
import type { PurchaseEntryInput } from '../../infrastructure/persistence/purchase-entry.repository.js'

@Controller('api/v1/entries/purchase')
export class PurchaseEntryV1Controller {
  constructor(@Inject(PurchaseEntryService) private readonly purchaseEntries: PurchaseEntryService) {}

  @Get()
  list(@Headers() headers: TenantRequestHeaders) {
    return this.purchaseEntries.list(headers)
  }

  @Get(':idOrUuid')
  get(@Headers() headers: TenantRequestHeaders, @Param('idOrUuid') idOrUuid: string) {
    return this.purchaseEntries.get(headers, idOrUuid)
  }

  @Post('upsert')
  upsert(@Headers() headers: TenantRequestHeaders, @Body() body: PurchaseEntryInput) {
    return this.purchaseEntries.upsert(headers, body)
  }

  @Post(':idOrUuid/destroy')
  destroy(@Headers() headers: TenantRequestHeaders, @Param('idOrUuid') idOrUuid: string) {
    return this.purchaseEntries.destroy(headers, idOrUuid)
  }

  @Post(':idOrUuid/restore')
  restore(@Headers() headers: TenantRequestHeaders, @Param('idOrUuid') idOrUuid: string) {
    return this.purchaseEntries.restore(headers, idOrUuid)
  }

  @Post(':idOrUuid/correction')
  correction(@Headers() headers: TenantRequestHeaders, @Param('idOrUuid') idOrUuid: string) {
    return this.purchaseEntries.correction(headers, idOrUuid)
  }

  @Post(':idOrUuid/reversal')
  reversal(@Headers() headers: TenantRequestHeaders, @Param('idOrUuid') idOrUuid: string) {
    return this.purchaseEntries.reversal(headers, idOrUuid)
  }

  @Post(':idOrUuid/comments')
  comment(
    @Headers() headers: TenantRequestHeaders,
    @Param('idOrUuid') idOrUuid: string,
    @Body() body: { body?: unknown },
  ) {
    return this.purchaseEntries.comment(headers, idOrUuid, body)
  }

  @Post(':idOrUuid/tools')
  tool(
    @Headers() headers: TenantRequestHeaders,
    @Param('idOrUuid') idOrUuid: string,
    @Body() body: { printHtml?: unknown; tool?: unknown },
  ) {
    return this.purchaseEntries.tool(headers, idOrUuid, body)
  }

  @Post(':idOrUuid/pdf')
  async pdf(
    @Headers() headers: TenantRequestHeaders,
    @Param('idOrUuid') idOrUuid: string,
    @Body() body: { printHtml?: unknown },
    @Res() reply: FastifyReply,
  ) {
    const result = await this.purchaseEntries.pdf(headers, idOrUuid, body)
    return reply
      .header('Content-Type', 'application/pdf')
      .header('Content-Length', result.file.length)
      .header('Content-Disposition', `attachment; filename="${result.fileName.replace(/"/g, '')}"`)
      .send(result.file)
  }
}
