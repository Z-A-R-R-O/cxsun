import type { FastifyReply } from 'fastify'
import { Body, Headers, Param, Res } from '../../../core/decorators/http-params.js'
import { Controller, Get, Post } from '../../../core/decorators/controller.js'
import { Inject } from '../../../core/decorators/inject.js'
import type { TenantRequestHeaders } from '../../../core/tenant/tenant-context.service.js'
import { PaymentEntryService } from './payment-entry.service.js'
import type { PaymentEntryInput } from './payment-entry.types.js'

@Controller('api/v1/entries/payment')
export class PaymentEntryController {
  constructor(@Inject(PaymentEntryService) private readonly payments: PaymentEntryService) {}

  @Get()
  list(@Headers() headers: TenantRequestHeaders) {
    return this.payments.list(headers)
  }

  @Get(':idOrUuid')
  get(@Headers() headers: TenantRequestHeaders, @Param('idOrUuid') idOrUuid: string) {
    return this.payments.get(headers, idOrUuid)
  }

  @Post('upsert')
  upsert(@Headers() headers: TenantRequestHeaders, @Body() body: PaymentEntryInput) {
    return this.payments.upsert(headers, body)
  }

  @Post(':idOrUuid/destroy')
  destroy(@Headers() headers: TenantRequestHeaders, @Param('idOrUuid') idOrUuid: string) {
    return this.payments.destroy(headers, idOrUuid)
  }

  @Post(':idOrUuid/restore')
  restore(@Headers() headers: TenantRequestHeaders, @Param('idOrUuid') idOrUuid: string) {
    return this.payments.restore(headers, idOrUuid)
  }

  @Post(':idOrUuid/correction')
  correction(@Headers() headers: TenantRequestHeaders, @Param('idOrUuid') idOrUuid: string) {
    return this.payments.correction(headers, idOrUuid)
  }

  @Post(':idOrUuid/reversal')
  reversal(@Headers() headers: TenantRequestHeaders, @Param('idOrUuid') idOrUuid: string) {
    return this.payments.reversal(headers, idOrUuid)
  }

  @Post(':idOrUuid/comments')
  addComment(@Headers() headers: TenantRequestHeaders, @Param('idOrUuid') idOrUuid: string, @Body() body: { body?: string }) {
    return this.payments.addComment(headers, idOrUuid, body.body ?? '')
  }

  @Post(':idOrUuid/tools')
  runTool(@Headers() headers: TenantRequestHeaders, @Param('idOrUuid') idOrUuid: string, @Body() body: { printHtml?: unknown; tool?: string }) {
    return this.payments.runTool(headers, idOrUuid, body.tool ?? '', body.printHtml)
  }

  @Post(':idOrUuid/pdf')
  async pdf(@Headers() headers: TenantRequestHeaders, @Param('idOrUuid') idOrUuid: string, @Body() body: { printHtml?: unknown }, @Res() reply: FastifyReply) {
    const result = await this.payments.pdf(headers, idOrUuid, body.printHtml)
    return reply
      .header('Content-Type', 'application/pdf')
      .header('Content-Length', result.file.length)
      .header('Content-Disposition', `attachment; filename="${result.fileName.replace(/"/g, '')}"`)
      .send(result.file)
  }
}
