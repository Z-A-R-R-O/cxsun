import type { PurchaseReceipt } from '../entities/purchase-receipt.entity.js'
import { PurchaseReceiptEvent } from '../events/purchase-receipt.events.js'

export class PurchaseReceiptAggregate {
  private constructor(
    private readonly entry: PurchaseReceipt,
    private readonly tenantId: number,
    private readonly actorEmail: string,
  ) {}

  static fromEntry(entry: PurchaseReceipt, tenantId: number, actorEmail: string) {
    return new PurchaseReceiptAggregate(entry, tenantId, actorEmail)
  }

  createdEvent() {
    return this.event('stock.inward.purchaseReceipt.created')
  }

  updatedEvent() {
    return this.event('stock.inward.purchaseReceipt.updated')
  }

  deletedEvent() {
    return this.event('stock.inward.purchaseReceipt.deleted')
  }

  restoredEvent() {
    return this.event('stock.inward.purchaseReceipt.restored')
  }

  private event(name: Parameters<typeof PurchaseReceiptEvent>[0]) {
    return PurchaseReceiptEvent(name, {
      actorEmail: this.actorEmail,
      entryId: this.entry.id,
      payload: { entryNo: this.entry.entry_no, grandTotal: this.entry.grand_total },
      tenantId: this.tenantId,
      uuid: this.entry.uuid,
    })
  }
}

