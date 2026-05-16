import type { SalesEntry } from '../entities/sales-entry.entity.js'
import { salesEntryEvent } from '../events/sales-entry.events.js'

export class SalesEntryAggregate {
  private constructor(
    private readonly entry: SalesEntry,
    private readonly tenantId: number,
    private readonly actorEmail: string,
  ) {}

  static fromEntry(entry: SalesEntry, tenantId: number, actorEmail: string) {
    return new SalesEntryAggregate(entry, tenantId, actorEmail)
  }

  createdEvent() {
    return this.event('entries.sales.created')
  }

  updatedEvent() {
    return this.event('entries.sales.updated')
  }

  deletedEvent() {
    return this.event('entries.sales.deleted')
  }

  restoredEvent() {
    return this.event('entries.sales.restored')
  }

  private event(name: Parameters<typeof salesEntryEvent>[0]) {
    return salesEntryEvent(name, {
      actorEmail: this.actorEmail,
      entryId: this.entry.id,
      payload: { invoiceNo: this.entry.invoice_no, grandTotal: this.entry.grand_total },
      tenantId: this.tenantId,
      uuid: this.entry.uuid,
    })
  }
}
