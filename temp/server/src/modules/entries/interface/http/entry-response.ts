import type { BillingEntryRecord, MoneyEntryRecord } from "../../domain/entry-record";

export function toBillingEntryResponse(entry: BillingEntryRecord) {
  return {
    ...entry,
    documentDate: entry.documentDate.toISOString(),
    dueDate: entry.dueDate?.toISOString() ?? null,
    ewayBillDate: entry.ewayBillDate?.toISOString() ?? null,
    eInvoiceAckDate: entry.eInvoiceAckDate?.toISOString() ?? null,
    supplierInvoiceDate: entry.supplierInvoiceDate?.toISOString() ?? null,
    createdAt: entry.createdAt.toISOString(),
    updatedAt: entry.updatedAt.toISOString(),
    deletedAt: entry.deletedAt?.toISOString() ?? null,
  };
}

export function toMoneyEntryResponse(entry: MoneyEntryRecord) {
  return {
    ...entry,
    documentDate: entry.documentDate.toISOString(),
    referenceDate: entry.referenceDate?.toISOString() ?? null,
    createdAt: entry.createdAt.toISOString(),
    updatedAt: entry.updatedAt.toISOString(),
    deletedAt: entry.deletedAt?.toISOString() ?? null,
    allocations: entry.allocations.map((allocation) => ({
      ...allocation,
      documentDate: allocation.documentDate?.toISOString() ?? null,
    })),
  };
}
