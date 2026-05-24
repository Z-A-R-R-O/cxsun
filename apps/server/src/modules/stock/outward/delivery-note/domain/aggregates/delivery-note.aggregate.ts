import type { DeliveryNote } from '../entities/delivery-note.entity.js'
import { DeliveryNoteEvent } from '../events/delivery-note.events.js'

export class DeliveryNoteAggregate {
  private constructor(
    private readonly entry: DeliveryNote,
    private readonly tenantId: number,
    private readonly actorEmail: string,
  ) {}

  static fromEntry(entry: DeliveryNote, tenantId: number, actorEmail: string) {
    return new DeliveryNoteAggregate(entry, tenantId, actorEmail)
  }

  createdEvent() {
    return this.event('stock.outward.deliveryNote.created')
  }

  updatedEvent() {
    return this.event('stock.outward.deliveryNote.updated')
  }

  deletedEvent() {
    return this.event('stock.outward.deliveryNote.deleted')
  }

  restoredEvent() {
    return this.event('stock.outward.deliveryNote.restored')
  }

  private event(name: Parameters<typeof DeliveryNoteEvent>[0]) {
    return DeliveryNoteEvent(name, {
      actorEmail: this.actorEmail,
      entryId: this.entry.id,
      payload: { entryNo: this.entry.entry_no, grandTotal: this.entry.grand_total },
      tenantId: this.tenantId,
      uuid: this.entry.uuid,
    })
  }
}

