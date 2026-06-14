import type { FastifyReply } from 'fastify'
import { Body, Headers, Param, Res } from '../../../core/decorators/http-params.js'
import { Controller, Get, Post } from '../../../core/decorators/controller.js'
import { Inject } from '../../../core/decorators/inject.js'
import type { TenantRequestHeaders } from '../../../core/tenant/tenant-context.service.js'
import { ReceiptEntryService } from './receipt-entry.service.js'
import type { ReceiptEntryInput } from './receipt-entry.types.js'

@Controller('api/v1/entries/receipt')
export class ReceiptEntryController {
  constructor(@Inject(ReceiptEntryService) private readonly receipts: ReceiptEntryService) {}

  @Get()
  list(@Headers() headers: TenantRequestHeaders) {
    return this.receipts.list(headers)
  }

  @Get(':idOrUuid')
  get(@Headers() headers: TenantRequestHeaders, @Param('idOrUuid') idOrUuid: string) {
    return this.receipts.get(headers, idOrUuid)
  }

  @Post('upsert')
  upsert(@Headers() headers: TenantRequestHeaders, @Body() body: ReceiptEntryInput) {
    return this.receipts.upsert(headers, body)
  }

  @Post(':idOrUuid/destroy')
  destroy(@Headers() headers: TenantRequestHeaders, @Param('idOrUuid') idOrUuid: string) {
    return this.receipts.destroy(headers, idOrUuid)
  }

  @Post(':idOrUuid/restore')
  restore(@Headers() headers: TenantRequestHeaders, @Param('idOrUuid') idOrUuid: string) {
    return this.receipts.restore(headers, idOrUuid)
  }

  @Post(':idOrUuid/correction')
  correction(@Headers() headers: TenantRequestHeaders, @Param('idOrUuid') idOrUuid: string) {
    return this.receipts.correction(headers, idOrUuid)
  }

  @Post(':idOrUuid/reversal')
  reversal(@Headers() headers: TenantRequestHeaders, @Param('idOrUuid') idOrUuid: string) {
    return this.receipts.reversal(headers, idOrUuid)
  }

  @Post(':idOrUuid/comments')
  addComment(@Headers() headers: TenantRequestHeaders, @Param('idOrUuid') idOrUuid: string, @Body() body: { body?: string }) {
    return this.receipts.addComment(headers, idOrUuid, body.body ?? '')
  }

  @Post(':idOrUuid/tools')
  runTool(@Headers() headers: TenantRequestHeaders, @Param('idOrUuid') idOrUuid: string, @Body() body: { printHtml?: unknown; tool?: string }) {
    return this.receipts.runTool(headers, idOrUuid, body.tool ?? '', body.printHtml)
  }

  @Post(':idOrUuid/pdf')
  async pdf(@Headers() headers: TenantRequestHeaders, @Param('idOrUuid') idOrUuid: string, @Body() body: { printHtml?: unknown }, @Res() reply: FastifyReply) {
    const result = await this.receipts.pdf(headers, idOrUuid, body.printHtml)
    return reply
      .header('Content-Type', 'application/pdf')
      .header('Content-Length', result.file.length)
      .header('Content-Disposition', `attachment; filename="${result.fileName.replace(/"/g, '')}"`)
      .send(result.file)
  }
}
