export type StockLedgerEventName =
  | 'stock.ledger.entryUpserted'
  | 'stock.ledger.settingsUpdated'
  | 'stock.ledger.serializationGenerated'
  | 'stock.ledger.serializationVerified'
  | 'stock.ledger.serializationPosted'
  | 'stock.ledger.outwardReserved'
  | 'stock.ledger.outwardPosted'

export interface StockLedgerDomainEvent {
  name: StockLedgerEventName
  tenantId: number
  actorEmail: string
  occurredAt: string
  payload: Record<string, unknown>
}

export function StockLedgerEvent(
  name: StockLedgerEventName,
  input: Omit<StockLedgerDomainEvent, 'name' | 'occurredAt'>,
): StockLedgerDomainEvent {
  return { ...input, name, occurredAt: new Date().toISOString() }
}
