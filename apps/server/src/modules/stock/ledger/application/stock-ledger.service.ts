import { Inject } from '../../../../core/decorators/inject.js'
import { Injectable } from '../../../../core/decorators/injectable.js'
import { TenantContextService, type TenantRequestHeaders } from '../../../../core/tenant/tenant-context.service.js'
import { StockLedgerEvent } from '../domain/events/stock-ledger.events.js'
import { StockLedgerRepository, type GenerateSerializationInput, type StockLedgerEntryInput, type StockLedgerSettingsInput, type VerifySerializationInput } from '../infrastructure/persistence/stock-ledger.repository.js'
import { StockLedgerEventBus } from './stock-ledger-event-bus.js'

@Injectable()
export class StockLedgerService {
  constructor(
    @Inject(() => TenantContextService) private readonly tenantContext: TenantContextService,
    @Inject(StockLedgerRepository) private readonly stockLedger: StockLedgerRepository,
    @Inject(StockLedgerEventBus) private readonly events: StockLedgerEventBus,
  ) {}

  async settings(headers: TenantRequestHeaders) {
    const context = await this.tenantContext.resolve(headers, 'company.manage')
    return this.stockLedger.getSettings(context)
  }

  async entries(headers: TenantRequestHeaders) {
    const context = await this.tenantContext.resolve(headers, 'company.manage')
    return this.stockLedger.listEntries(context)
  }

  async entry(headers: TenantRequestHeaders, idOrUuid: string) {
    const context = await this.tenantContext.resolve(headers, 'company.manage')
    return this.stockLedger.findEntry(context, idOrUuid)
  }

  async upsertEntry(headers: TenantRequestHeaders, input: StockLedgerEntryInput) {
    const context = await this.tenantContext.resolve(headers, 'company.manage')
    const entry = await this.stockLedger.upsertEntry(context, input)
    await this.events.publish(StockLedgerEvent('stock.ledger.entryUpserted', {
      actorEmail: context.user.email,
      payload: { entryUuid: entry?.uuid, entryNo: entry?.entry_no },
      tenantId: context.tenant.id,
    }))
    return { ok: true, entry }
  }

  async upsertSettings(headers: TenantRequestHeaders, input: StockLedgerSettingsInput) {
    const context = await this.tenantContext.resolve(headers, 'company.manage')
    const settings = await this.stockLedger.upsertSettings(context, input)
    await this.events.publish(StockLedgerEvent('stock.ledger.settingsUpdated', {
      actorEmail: context.user.email,
      payload: { companyId: settings.company_id },
      tenantId: context.tenant.id,
    }))
    return { ok: true, settings }
  }

  async purchaseReceiptIntake(headers: TenantRequestHeaders, idOrUuid: string) {
    const context = await this.tenantContext.resolve(headers, 'company.manage')
    return this.stockLedger.receiptIntake(context, idOrUuid)
  }

  async generateSerialization(headers: TenantRequestHeaders, input: GenerateSerializationInput) {
    const context = await this.tenantContext.resolve(headers, 'company.manage')
    const serialization = await this.stockLedger.generateSerialization(context, input)
    await this.events.publish(StockLedgerEvent('stock.ledger.serializationGenerated', {
      actorEmail: context.user.email,
      payload: { serializationUuid: serialization?.uuid, purchaseReceiptNo: serialization?.purchase_receipt_no },
      tenantId: context.tenant.id,
    }))
    return { ok: true, serialization }
  }

  async verifySerialization(headers: TenantRequestHeaders, idOrUuid: string, input: VerifySerializationInput) {
    const context = await this.tenantContext.resolve(headers, 'company.manage')
    const result = await this.stockLedger.verifySerialization(context, idOrUuid, input)
    await this.events.publish(StockLedgerEvent('stock.ledger.serializationVerified', {
      actorEmail: context.user.email,
      payload: { serializationUuid: result.serialization?.uuid, matched: result.matched, unknown: result.unknown },
      tenantId: context.tenant.id,
    }))
    return { ok: true, ...result }
  }

  async postSerialization(headers: TenantRequestHeaders, idOrUuid: string) {
    const context = await this.tenantContext.resolve(headers, 'company.manage')
    const serialization = await this.stockLedger.postSerialization(context, idOrUuid)
    await this.events.publish(StockLedgerEvent('stock.ledger.serializationPosted', {
      actorEmail: context.user.email,
      payload: { serializationUuid: serialization?.uuid, purchaseReceiptNo: serialization?.purchase_receipt_no },
      tenantId: context.tenant.id,
    }))
    return { ok: true, serialization }
  }

  async dropSerialization(headers: TenantRequestHeaders, idOrUuid: string) {
    const context = await this.tenantContext.resolve(headers, 'company.manage')
    await this.stockLedger.dropSerialization(context, idOrUuid)
    await this.events.publish(StockLedgerEvent('stock.ledger.serializationGenerated', {
      actorEmail: context.user.email,
      payload: { droppedSerialization: idOrUuid },
      tenantId: context.tenant.id,
    }))
    return { ok: true }
  }

  async balances(headers: TenantRequestHeaders) {
    const context = await this.tenantContext.resolve(headers, 'company.manage')
    return this.stockLedger.listBalances(context)
  }

  async barcodeAvailability(headers: TenantRequestHeaders, barcode: string) {
    const context = await this.tenantContext.resolve(headers, 'company.manage')
    return this.stockLedger.checkBarcodeAvailability(context, barcode)
  }
}
