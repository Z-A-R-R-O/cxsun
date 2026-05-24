export type DeliveryNoteEventName =
  | 'stock.outward.deliveryNote.created'
  | 'stock.outward.deliveryNote.updated'
  | 'stock.outward.deliveryNote.deleted'
  | 'stock.outward.deliveryNote.restored'
  | 'stock.outward.deliveryNote.commented'
  | 'stock.outward.deliveryNote.tool'

export interface DeliveryNoteDomainEvent {
  name: DeliveryNoteEventName
  entryId: number
  uuid: string
  tenantId: number
  actorEmail: string
  occurredAt: string
  payload: Record<string, unknown>
}

export function DeliveryNoteEvent(
  name: DeliveryNoteEventName,
  input: Omit<DeliveryNoteDomainEvent, 'name' | 'occurredAt'>,
): DeliveryNoteDomainEvent {
  return { ...input, name, occurredAt: new Date().toISOString() }
}

