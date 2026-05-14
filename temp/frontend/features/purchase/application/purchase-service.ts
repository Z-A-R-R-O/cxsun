import {
  deletePurchase,
  getPurchase,
  listPurchase,
  upsertPurchase,
} from "../infrastructure/purchase-api";
import { purchaseColumnCatalog } from "../domain/purchase";
import type {
  PurchaseColumnId,
  PurchaseColumnOption,
  PurchaseInput,
  PurchaseRecord,
} from "../domain/purchase";

export { deletePurchase, getPurchase, listPurchase, upsertPurchase };

export function buildPurchaseColumnOptions(params: {
  readonly visibleColumns: Record<PurchaseColumnId, boolean>;
  readonly onToggle: (columnId: PurchaseColumnId, checked: boolean) => void;
}): readonly PurchaseColumnOption[] {
  return purchaseColumnCatalog.map((column) => ({
    id: column.id,
    label: column.label,
    checked: params.visibleColumns[column.id],
    disabled:
      params.visibleColumns[column.id] &&
      purchaseColumnCatalog.filter((item) => params.visibleColumns[item.id]).length === 1,
    onCheckedChange: (checked) => params.onToggle(column.id, checked),
  }));
}

export function filterPurchase(
  records: readonly PurchaseRecord[],
  search: string,
  statusFilter: "all" | "draft" | "posted" | "cancelled" = "all",
) {
  const normalized = search.trim().toLowerCase();
  return records.filter(
    (record) =>
      (statusFilter === "all" || record.status === statusFilter) &&
      (normalized.length === 0 ||
        [
          record.documentNo,
          record.documentDate,
          record.partyName,
          record.supplierInvoiceNo,
          record.referenceNo,
          record.status,
          record.paymentStatus,
        ].some((value) =>
          String(value ?? "")
            .toLowerCase()
            .includes(normalized),
        )),
  );
}

export function preparePurchaseInput(input: PurchaseInput): PurchaseInput {
  return {
    ...input,
    partyName: input.partyName.trim(),
    documentNo: input.documentNo.trim(),
    items: input.items
      .map((item, index) => ({
        ...item,
        areaSq: Number(item.areaSq || 0),
        productName: item.productName.trim(),
        quantity: Number(item.quantity || 0),
        rate: Number(item.rate || 0),
        taxRate: Number(item.taxRate || 0),
        sortOrder: index + 1,
      }))
      .filter((item) => item.productName),
  };
}

export function formatMoney(value: number) {
  return new Intl.NumberFormat("en-IN", { currency: "INR", style: "currency" }).format(value);
}

export function formatEntryDate(value: string | null) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(new Date(value));
}
