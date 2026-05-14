import {
  deleteReceipt,
  getReceipt,
  listReceipts,
  upsertReceipt,
} from "../infrastructure/receipt-api";
import { receiptColumnCatalog } from "../domain/receipt";
import type {
  ReceiptColumnId,
  ReceiptColumnOption,
  ReceiptInput,
  ReceiptRecord,
} from "../domain/receipt";

export { deleteReceipt, getReceipt, listReceipts, upsertReceipt };

export function buildReceiptColumnOptions(params: {
  readonly visibleColumns: Record<ReceiptColumnId, boolean>;
  readonly onToggle: (columnId: ReceiptColumnId, checked: boolean) => void;
}): readonly ReceiptColumnOption[] {
  return receiptColumnCatalog.map((column) => ({
    id: column.id,
    label: column.label,
    checked: params.visibleColumns[column.id],
    disabled:
      params.visibleColumns[column.id] &&
      receiptColumnCatalog.filter((item) => params.visibleColumns[item.id]).length === 1,
    onCheckedChange: (checked) => params.onToggle(column.id, checked),
  }));
}

export function filterReceipts(
  records: readonly ReceiptRecord[],
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
          record.mode,
          record.ledgerName,
          record.referenceNo,
          record.status,
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(normalized))),
  );
}

export function prepareReceiptInput(input: ReceiptInput): ReceiptInput {
  return {
    ...input,
    amount: Number(input.amount || 0),
    discountAmount: Number(input.discountAmount || 0),
    documentNo: input.documentNo.trim(),
    partyName: input.partyName.trim(),
    roundOff: Number(input.roundOff || 0),
    tdsAmount: Number(input.tdsAmount || 0),
    allocations: input.allocations
      .map((allocation, index) => ({
        ...allocation,
        allocatedAmount: Number(allocation.allocatedAmount || 0),
        documentNo: allocation.documentNo.trim(),
        documentTotal: Number(allocation.documentTotal || 0),
        previousBalance: Number(allocation.previousBalance || 0),
        sortOrder: index + 1,
      }))
      .filter((allocation) => allocation.documentNo || allocation.allocatedAmount > 0),
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
