export type SalesEntryEventName =
  | 'entries.sales.created'
  | 'entries.sales.updated'
  | 'entries.sales.deleted'
  | 'entries.sales.restored'
  | 'entries.sales.commented'
  | 'entries.sales.tool'

export interface SalesEntryDomainEvent {
  name: SalesEntryEventName
  entryId: number
  uuid: string
  tenantId: number
  actorEmail: string
  occurredAt: string
  payload: Record<string, unknown>
}

export function salesEntryEvent(
  name: SalesEntryEventName,
  input: Omit<SalesEntryDomainEvent, 'name' | 'occurredAt'>,
): SalesEntryDomainEvent {
  return { ...input, name, occurredAt: new Date().toISOString() }
}
