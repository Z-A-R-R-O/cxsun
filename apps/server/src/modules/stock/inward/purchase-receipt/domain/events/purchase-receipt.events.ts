export type PurchaseReceiptEventName =
  | 'stock.inward.purchaseReceipt.created'
  | 'stock.inward.purchaseReceipt.updated'
  | 'stock.inward.purchaseReceipt.deleted'
  | 'stock.inward.purchaseReceipt.restored'
  | 'stock.inward.purchaseReceipt.commented'
  | 'stock.inward.purchaseReceipt.tool'

export interface PurchaseReceiptDomainEvent {
  name: PurchaseReceiptEventName
  entryId: number
  uuid: string
  tenantId: number
  actorEmail: string
  occurredAt: string
  payload: Record<string, unknown>
}

export function PurchaseReceiptEvent(
  name: PurchaseReceiptEventName,
  input: Omit<PurchaseReceiptDomainEvent, 'name' | 'occurredAt'>,
): PurchaseReceiptDomainEvent {
  return { ...input, name, occurredAt: new Date().toISOString() }
}

