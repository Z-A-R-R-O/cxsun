import { Body, Headers, Param } from '../../../../../../core/decorators/http-params.js'
import { Controller, Get, Post } from '../../../../../../core/decorators/controller.js'
import { Inject } from '../../../../../../core/decorators/inject.js'
import type { TenantRequestHeaders } from '../../../../../../core/tenant/tenant-context.service.js'
import { DeliveryNoteService } from '../../application/delivery-note.service.js'
import type { DeliveryNoteInput } from '../../infrastructure/persistence/delivery-note.repository.js'

@Controller('api/v1/stock/outward/delivery-notes')
export class DeliveryNoteV1Controller {
  constructor(@Inject(DeliveryNoteService) private readonly deliveryNotes: DeliveryNoteService) {}

  @Get()
  list(@Headers() headers: TenantRequestHeaders) {
    return this.deliveryNotes.list(headers)
  }

  @Get(':idOrUuid')
  get(@Headers() headers: TenantRequestHeaders, @Param('idOrUuid') idOrUuid: string) {
    return this.deliveryNotes.get(headers, idOrUuid)
  }

  @Post('upsert')
  upsert(@Headers() headers: TenantRequestHeaders, @Body() body: DeliveryNoteInput) {
    return this.deliveryNotes.upsert(headers, body)
  }

  @Post(':idOrUuid/destroy')
  destroy(@Headers() headers: TenantRequestHeaders, @Param('idOrUuid') idOrUuid: string) {
    return this.deliveryNotes.destroy(headers, idOrUuid)
  }

  @Post(':idOrUuid/restore')
  restore(@Headers() headers: TenantRequestHeaders, @Param('idOrUuid') idOrUuid: string) {
    return this.deliveryNotes.restore(headers, idOrUuid)
  }

  @Post(':idOrUuid/comments')
  comment(
    @Headers() headers: TenantRequestHeaders,
    @Param('idOrUuid') idOrUuid: string,
    @Body() body: { body?: unknown },
  ) {
    return this.deliveryNotes.comment(headers, idOrUuid, body)
  }

  @Post(':idOrUuid/tools')
  tool(
    @Headers() headers: TenantRequestHeaders,
    @Param('idOrUuid') idOrUuid: string,
    @Body() body: { tool?: unknown },
  ) {
    return this.deliveryNotes.tool(headers, idOrUuid, body)
  }
}

