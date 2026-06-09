export type QuotationEntryEventName =
  | 'entries.quotation.created'
  | 'entries.quotation.updated'
  | 'entries.quotation.deleted'
  | 'entries.quotation.restored'
  | 'entries.quotation.commented'
  | 'entries.quotation.tool'

export interface QuotationEntryDomainEvent {
  name: QuotationEntryEventName
  entryId: number
  uuid: string
  tenantId: number
  actorEmail: string
  occurredAt: string
  payload: Record<string, unknown>
}

export function QuotationEntryEvent(
  name: QuotationEntryEventName,
  input: Omit<QuotationEntryDomainEvent, 'name' | 'occurredAt'>,
): QuotationEntryDomainEvent {
  return { ...input, name, occurredAt: new Date().toISOString() }
}

