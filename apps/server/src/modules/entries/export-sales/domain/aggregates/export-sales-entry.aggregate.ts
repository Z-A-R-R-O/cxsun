import type { ExportSalesEntry } from '../entities/export-sales-entry.entity.js'
import { ExportSalesEntryEvent } from '../events/export-sales-entry.events.js'

export class ExportSalesEntryAggregate {
  private constructor(
    private readonly entry: ExportSalesEntry,
    private readonly tenantId: number,
    private readonly actorEmail: string,
  ) {}

  static fromEntry(entry: ExportSalesEntry, tenantId: number, actorEmail: string) {
    return new ExportSalesEntryAggregate(entry, tenantId, actorEmail)
  }

  createdEvent() {
    return this.event('entries.exportSales.created')
  }

  updatedEvent() {
    return this.event('entries.exportSales.updated')
  }

  deletedEvent() {
    return this.event('entries.exportSales.deleted')
  }

  restoredEvent() {
    return this.event('entries.exportSales.restored')
  }

  private event(name: Parameters<typeof ExportSalesEntryEvent>[0]) {
    return ExportSalesEntryEvent(name, {
      actorEmail: this.actorEmail,
      entryId: this.entry.id,
      payload: { invoiceNo: this.entry.invoice_no, grandTotal: this.entry.grand_total },
      tenantId: this.tenantId,
      uuid: this.entry.uuid,
    })
  }
}




