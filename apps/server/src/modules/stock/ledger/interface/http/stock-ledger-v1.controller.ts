import { Body, Headers, Param } from '../../../../../core/decorators/http-params.js'
import { Controller, Get, Post } from '../../../../../core/decorators/controller.js'
import { Inject } from '../../../../../core/decorators/inject.js'
import type { TenantRequestHeaders } from '../../../../../core/tenant/tenant-context.service.js'
import { StockLedgerService } from '../../application/stock-ledger.service.js'
import type { GenerateSerializationInput, StockLedgerEntryInput, StockLedgerSettingsInput, VerifySerializationInput } from '../../infrastructure/persistence/stock-ledger.repository.js'

@Controller('api/v1/stock/ledger')
export class StockLedgerV1Controller {
  constructor(@Inject(StockLedgerService) private readonly stockLedger: StockLedgerService) {}

  @Get('settings')
  settings(@Headers() headers: TenantRequestHeaders) {
    return this.stockLedger.settings(headers)
  }

  @Get('entries')
  entries(@Headers() headers: TenantRequestHeaders) {
    return this.stockLedger.entries(headers)
  }

  @Get('entries/:idOrUuid')
  entry(@Headers() headers: TenantRequestHeaders, @Param('idOrUuid') idOrUuid: string) {
    return this.stockLedger.entry(headers, idOrUuid)
  }

  @Post('entries/upsert')
  upsertEntry(@Headers() headers: TenantRequestHeaders, @Body() body: StockLedgerEntryInput) {
    return this.stockLedger.upsertEntry(headers, body)
  }

  @Post('settings')
  upsertSettings(@Headers() headers: TenantRequestHeaders, @Body() body: StockLedgerSettingsInput) {
    return this.stockLedger.upsertSettings(headers, body)
  }

  @Get('purchase-receipts/:idOrUuid/intake')
  purchaseReceiptIntake(@Headers() headers: TenantRequestHeaders, @Param('idOrUuid') idOrUuid: string) {
    return this.stockLedger.purchaseReceiptIntake(headers, idOrUuid)
  }

  @Post('serializations/generate')
  generateSerialization(@Headers() headers: TenantRequestHeaders, @Body() body: GenerateSerializationInput) {
    return this.stockLedger.generateSerialization(headers, body)
  }

  @Post('serializations/:idOrUuid/verify')
  verifySerialization(@Headers() headers: TenantRequestHeaders, @Param('idOrUuid') idOrUuid: string, @Body() body: VerifySerializationInput) {
    return this.stockLedger.verifySerialization(headers, idOrUuid, body)
  }

  @Post('serializations/:idOrUuid/post')
  postSerialization(@Headers() headers: TenantRequestHeaders, @Param('idOrUuid') idOrUuid: string) {
    return this.stockLedger.postSerialization(headers, idOrUuid)
  }

  @Post('serializations/:idOrUuid/drop')
  dropSerialization(@Headers() headers: TenantRequestHeaders, @Param('idOrUuid') idOrUuid: string) {
    return this.stockLedger.dropSerialization(headers, idOrUuid)
  }

  @Get('balances')
  balances(@Headers() headers: TenantRequestHeaders) {
    return this.stockLedger.balances(headers)
  }

  @Get('barcodes/:barcode/availability')
  barcodeAvailability(@Headers() headers: TenantRequestHeaders, @Param('barcode') barcode: string) {
    return this.stockLedger.barcodeAvailability(headers, barcode)
  }
}
