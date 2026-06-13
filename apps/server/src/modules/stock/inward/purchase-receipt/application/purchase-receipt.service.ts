import { Inject } from '../../../../../core/decorators/inject.js'
import { Injectable } from '../../../../../core/decorators/injectable.js'
import { NotFoundException } from '../../../../../core/exceptions/http.exception.js'
import { TenantContextService, type TenantRequestHeaders } from '../../../../../core/tenant/tenant-context.service.js'
import { PurchaseReceiptAggregate } from '../domain/aggregates/purchase-receipt.aggregate.js'
import { PurchaseReceiptEvent } from '../domain/events/purchase-receipt.events.js'
import { PurchaseReceiptRepository, type PurchaseReceiptInput } from '../infrastructure/persistence/purchase-receipt.repository.js'
import { PurchaseReceiptEventBus } from './purchase-receipt-event-bus.js'

@Injectable()
export class PurchaseReceiptService {
  constructor(
    @Inject(() => TenantContextService) private readonly tenantContext: TenantContextService,
    @Inject(PurchaseReceiptRepository) private readonly purchaseReceipts: PurchaseReceiptRepository,
    @Inject(PurchaseReceiptEventBus) private readonly events: PurchaseReceiptEventBus,
  ) {}

  async list(headers: TenantRequestHeaders) {
    const context = await this.tenantContext.resolve(headers, 'company.manage')
    return this.purchaseReceipts.list(context)
  }

  async get(headers: TenantRequestHeaders, idOrUuid: string) {
    const context = await this.tenantContext.resolve(headers, 'company.manage')
    const entry = await this.purchaseReceipts.find(context, idOrUuid)
    if (!entry) throw new NotFoundException('Purchase receipt was not found.')
    return entry
  }

  async upsert(headers: TenantRequestHeaders, input: PurchaseReceiptInput) {
    const context = await this.tenantContext.resolve(headers, 'company.manage')
    const entry = input.id || input.uuid
      ? await this.purchaseReceipts.update(context, String(input.uuid ?? input.id), input)
      : await this.purchaseReceipts.insert(context, input)
    if (!entry) throw new NotFoundException('Purchase receipt was not found.')
    const aggregate = PurchaseReceiptAggregate.fromEntry(entry, context.tenant.id, context.user.email)
    await this.events.publish(input.id || input.uuid ? aggregate.updatedEvent() : aggregate.createdEvent())
    return { ok: true, entry }
  }

  async destroy(headers: TenantRequestHeaders, idOrUuid: string) {
    const context = await this.tenantContext.resolve(headers, 'company.manage')
    const entry = await this.purchaseReceipts.softDelete(context, idOrUuid)
    if (!entry) return { ok: false, error: 'Purchase receipt was not found.' }
    await this.events.publish(PurchaseReceiptAggregate.fromEntry(entry, context.tenant.id, context.user.email).deletedEvent())
    return { ok: true }
  }

  async restore(headers: TenantRequestHeaders, idOrUuid: string) {
    const context = await this.tenantContext.resolve(headers, 'company.manage')
    const entry = await this.purchaseReceipts.restore(context, idOrUuid)
    if (!entry) return { ok: false, error: 'Purchase receipt was not found.' }
    await this.events.publish(PurchaseReceiptAggregate.fromEntry(entry, context.tenant.id, context.user.email).restoredEvent())
    return { ok: true }
  }

  async comment(headers: TenantRequestHeaders, idOrUuid: string, body: { body?: unknown }) {
    const context = await this.tenantContext.resolve(headers, 'company.manage')
    const entry = await this.purchaseReceipts.addComment(context, idOrUuid, String(body.body ?? '').trim())
    if (!entry) throw new NotFoundException('Purchase receipt was not found.')
    await this.events.publish(PurchaseReceiptEvent('stock.inward.purchaseReceipt.commented', {
      actorEmail: context.user.email,
      entryId: entry.id,
      payload: { entryNo: entry.entry_no },
      tenantId: context.tenant.id,
      uuid: entry.uuid,
    }))
    return { ok: true, entry }
  }

  async tool(headers: TenantRequestHeaders, idOrUuid: string, body: { tool?: unknown }) {
    const context = await this.tenantContext.resolve(headers, 'company.manage')
    const entry = await this.purchaseReceipts.addActivity(context, idOrUuid, 'tool', `${String(body.tool ?? 'tool')} requested`)
    if (!entry) throw new NotFoundException('Purchase receipt was not found.')
    await this.events.publish(PurchaseReceiptEvent('stock.inward.purchaseReceipt.tool', {
      actorEmail: context.user.email,
      entryId: entry.id,
      payload: { tool: String(body.tool ?? 'tool'), entryNo: entry.entry_no },
      tenantId: context.tenant.id,
      uuid: entry.uuid,
    }))
    return { ok: true, entry }
  }
}

