import type { QuotationEntry } from '../entities/quotation-entry.entity.js'
import { QuotationEntryEvent } from '../events/quotation-entry.events.js'

export class QuotationEntryAggregate {
  private constructor(
    private readonly entry: QuotationEntry,
    private readonly tenantId: number,
    private readonly actorEmail: string,
  ) {}

  static fromEntry(entry: QuotationEntry, tenantId: number, actorEmail: string) {
    return new QuotationEntryAggregate(entry, tenantId, actorEmail)
  }

  createdEvent() {
    return this.event('entries.quotation.created')
  }

  updatedEvent() {
    return this.event('entries.quotation.updated')
  }

  deletedEvent() {
    return this.event('entries.quotation.deleted')
  }

  restoredEvent() {
    return this.event('entries.quotation.restored')
  }

  private event(name: Parameters<typeof QuotationEntryEvent>[0]) {
    return QuotationEntryEvent(name, {
      actorEmail: this.actorEmail,
      entryId: this.entry.id,
      payload: { invoiceNo: this.entry.invoice_no, grandTotal: this.entry.grand_total },
      tenantId: this.tenantId,
      uuid: this.entry.uuid,
    })
  }
}

