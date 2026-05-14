import { deleteSales, getSales, listSales, upsertSales } from "../infrastructure/sales-api";
import {
  listSalesContactLookups,
  listSalesProductLookups,
  listSupplierContactLookups,
} from "../infrastructure/sales-lookup-api";
import { salesColumnCatalog } from "../domain/sales";
import type {
  SalesColumnId,
  SalesColumnOption,
  SalesInput,
  SalesItemInput,
  SalesRecord,
} from "../domain/sales";

export {
  deleteSales,
  getSales,
  listSales,
  listSalesContactLookups,
  listSalesProductLookups,
  listSupplierContactLookups,
  upsertSales,
};

export function buildSalesColumnOptions(params: {
  readonly visibleColumns: Record<SalesColumnId, boolean>;
  readonly onToggle: (columnId: SalesColumnId, checked: boolean) => void;
}): readonly SalesColumnOption[] {
  return salesColumnCatalog.map((column) => ({
    id: column.id,
    label: column.label,
    checked: params.visibleColumns[column.id],
    disabled:
      params.visibleColumns[column.id] &&
      salesColumnCatalog.filter((item) => params.visibleColumns[item.id]).length === 1,
    onCheckedChange: (checked) => params.onToggle(column.id, checked),
  }));
}

export function filterSales(
  records: readonly SalesRecord[],
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
          record.referenceNo,
          record.status,
          record.paymentStatus,
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(normalized))),
  );
}

export function prepareSalesInput(input: SalesInput): SalesInput {
  return {
    ...input,
    partyName: input.partyName.trim(),
    documentNo: input.documentNo.trim(),
    eInvoiceAckNo: input.eInvoiceAckNo?.trim() || null,
    eInvoiceIrn: input.eInvoiceIrn?.trim() || null,
    eInvoiceSignedQr: input.eInvoiceSignedQr?.trim() || null,
    ewayBillNo: input.ewayBillNo?.trim() || null,
    notes: input.notes?.trim() || null,
    roundOff: Number(input.roundOff || 0),
    terms: input.terms?.trim() || null,
    items: input.items
      .map((item, index) => ({
        ...item,
        productName: item.productName.trim(),
        poNo: item.poNo?.trim() || null,
        dcNo: item.dcNo?.trim() || null,
        description: item.description?.trim() || null,
        size: item.size?.trim() || null,
        colour: item.colour?.trim() || null,
        areaSq: Number(item.areaSq || 0),
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

export function calculateSalesTotals(items: readonly SalesItemInput[], roundOff: number) {
  const taxableAmount = items.reduce(
    (sum, item) => sum + Number(item.quantity || 0) * Number(item.rate || 0),
    0,
  );
  const gstTotal = items.reduce(
    (sum, item) =>
      sum + (Number(item.quantity || 0) * Number(item.rate || 0) * Number(item.taxRate || 0)) / 100,
    0,
  );
  const grandTotal = taxableAmount + gstTotal + Number(roundOff || 0);

  return { taxableAmount, gstTotal, grandTotal };
}

export function formatEntryDate(value: string | null) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(new Date(value));
}
