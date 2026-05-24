import { Body, Headers, Param } from '../../../../../../core/decorators/http-params.js'
import { Controller, Get, Post } from '../../../../../../core/decorators/controller.js'
import { Inject } from '../../../../../../core/decorators/inject.js'
import type { TenantRequestHeaders } from '../../../../../../core/tenant/tenant-context.service.js'
import { PurchaseReceiptService } from '../../application/purchase-receipt.service.js'
import type { PurchaseReceiptInput } from '../../infrastructure/persistence/purchase-receipt.repository.js'

@Controller('api/v1/stock/inward/purchase-receipts')
export class PurchaseReceiptV1Controller {
  constructor(@Inject(PurchaseReceiptService) private readonly purchaseReceipts: PurchaseReceiptService) {}

  @Get()
  list(@Headers() headers: TenantRequestHeaders) {
    return this.purchaseReceipts.list(headers)
  }

  @Get(':idOrUuid')
  get(@Headers() headers: TenantRequestHeaders, @Param('idOrUuid') idOrUuid: string) {
    return this.purchaseReceipts.get(headers, idOrUuid)
  }

  @Post('upsert')
  upsert(@Headers() headers: TenantRequestHeaders, @Body() body: PurchaseReceiptInput) {
    return this.purchaseReceipts.upsert(headers, body)
  }

  @Post(':idOrUuid/destroy')
  destroy(@Headers() headers: TenantRequestHeaders, @Param('idOrUuid') idOrUuid: string) {
    return this.purchaseReceipts.destroy(headers, idOrUuid)
  }

  @Post(':idOrUuid/restore')
  restore(@Headers() headers: TenantRequestHeaders, @Param('idOrUuid') idOrUuid: string) {
    return this.purchaseReceipts.restore(headers, idOrUuid)
  }

  @Post(':idOrUuid/comments')
  comment(
    @Headers() headers: TenantRequestHeaders,
    @Param('idOrUuid') idOrUuid: string,
    @Body() body: { body?: unknown },
  ) {
    return this.purchaseReceipts.comment(headers, idOrUuid, body)
  }

  @Post(':idOrUuid/tools')
  tool(
    @Headers() headers: TenantRequestHeaders,
    @Param('idOrUuid') idOrUuid: string,
    @Body() body: { tool?: unknown },
  ) {
    return this.purchaseReceipts.tool(headers, idOrUuid, body)
  }
}

