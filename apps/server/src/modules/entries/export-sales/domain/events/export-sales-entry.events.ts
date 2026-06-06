export type ExportSalesEntryEventName =
  | 'entries.exportSales.created'
  | 'entries.exportSales.updated'
  | 'entries.exportSales.deleted'
  | 'entries.exportSales.restored'
  | 'entries.exportSales.commented'
  | 'entries.exportSales.tool'

export interface ExportSalesEntryDomainEvent {
  name: ExportSalesEntryEventName
  entryId: number
  uuid: string
  tenantId: number
  actorEmail: string
  occurredAt: string
  payload: Record<string, unknown>
}

export function ExportSalesEntryEvent(
  name: ExportSalesEntryEventName,
  input: Omit<ExportSalesEntryDomainEvent, 'name' | 'occurredAt'>,
): ExportSalesEntryDomainEvent {
  return { ...input, name, occurredAt: new Date().toISOString() }
}




