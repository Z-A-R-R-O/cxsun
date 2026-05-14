import { randomUUID } from "node:crypto";
import type {
  AllocationInput,
  BillingEntryInput,
  BillingItemInput,
  MoneyEntryInput,
} from "../services/entries.repository";
import type { BillingEntryKind, MoneyEntryKind } from "../../domain/entry-record";

export function normalizeBillingInput(kind: BillingEntryKind, input: BillingEntryInput) {
  const items = (input.items ?? []).map((item, index) => normalizeBillingItem(item, index));
  const subtotal = items.reduce((sum, item) => sum + item.lineSubtotal, 0);
  const discountTotal = items.reduce((sum, item) => sum + item.discountAmount, 0);
  const taxTotal = items.reduce((sum, item) => sum + item.taxAmount, 0);
  const taxableTotal = subtotal - discountTotal;
  const roundOff = numberValue(input.roundOff);
  const grandTotal = taxableTotal + taxTotal + roundOff;

  return {
    companyId: requiredIdentifier(input.companyId, "Company context is required."),
    accountingYearId: requiredIdentifier(
      input.accountingYearId,
      "Accounting year context is required.",
    ),
    documentNo: requiredText(input.documentNo, "Document number is required."),
    documentDate: dateOrNow(input.documentDate),
    partyId: emptyAsNull(input.partyId),
    partyName: requiredText(input.partyName, "Party name is required."),
    billingAddress: emptyAsNull(input.billingAddress),
    shippingAddress: kind === "sales" ? emptyAsNull(input.shippingAddress) : null,
    placeOfSupply: emptyAsNull(input.placeOfSupply),
    priceListId: kind === "sales" ? emptyAsNull(input.priceListId) : null,
    referenceNo: emptyAsNull(input.referenceNo),
    dueDate: dateOrNull(input.dueDate),
    ewayBillNo: kind === "sales" ? emptyAsNull(input.ewayBillNo) : null,
    ewayBillDate: kind === "sales" ? dateOrNull(input.ewayBillDate) : null,
    eInvoiceIrn: kind === "sales" ? emptyAsNull(input.eInvoiceIrn) : null,
    eInvoiceAckNo: kind === "sales" ? emptyAsNull(input.eInvoiceAckNo) : null,
    eInvoiceAckDate: kind === "sales" ? dateOrNull(input.eInvoiceAckDate) : null,
    eInvoiceSignedQr: kind === "sales" ? emptyAsNull(input.eInvoiceSignedQr) : null,
    supplierInvoiceNo: kind === "purchase" ? emptyAsNull(input.supplierInvoiceNo) : null,
    supplierInvoiceDate: kind === "purchase" ? dateOrNull(input.supplierInvoiceDate) : null,
    subtotal,
    discountTotal,
    taxableTotal,
    taxTotal,
    roundOff,
    grandTotal,
    paidAmount: 0,
    balanceAmount: grandTotal,
    status: input.status?.trim() || "draft",
    paymentStatus: input.paymentStatus?.trim() || "unpaid",
    notes: emptyAsNull(input.notes),
    terms: emptyAsNull(input.terms),
    isActive: input.isActive ?? true,
    items,
  };
}

export function normalizeMoneyInput(kind: MoneyEntryKind, input: MoneyEntryInput) {
  const amount = numberValue(input.amount);
  const tdsAmount = numberValue(input.tdsAmount);
  const discountAmount = numberValue(input.discountAmount);
  const roundOff = numberValue(input.roundOff);
  const netAmount = amount - tdsAmount - discountAmount + roundOff;
  const allocations = (input.allocations ?? []).map((item, index) =>
    normalizeAllocation(item, index),
  );
  const allocatedAmount = allocations.reduce((sum, item) => sum + item.allocatedAmount, 0);

  return {
    companyId: requiredIdentifier(input.companyId, "Company context is required."),
    accountingYearId: requiredIdentifier(
      input.accountingYearId,
      "Accounting year context is required.",
    ),
    documentNo: requiredText(input.documentNo, "Document number is required."),
    documentDate: dateOrNow(input.documentDate),
    partyId: emptyAsNull(input.partyId),
    partyName: requiredText(input.partyName, "Party name is required."),
    partyType: emptyAsNull(input.partyType),
    ledgerId: emptyAsNull(input.ledgerId),
    ledgerName: emptyAsNull(input.ledgerName),
    mode: input.mode?.trim() || (kind === "payment" ? "bank" : "cash"),
    bankAccountId: emptyAsNull(input.bankAccountId),
    referenceNo: emptyAsNull(input.referenceNo),
    referenceDate: dateOrNull(input.referenceDate),
    amount,
    tdsAmount,
    discountAmount,
    roundOff,
    netAmount,
    allocatedAmount,
    unallocatedAmount: netAmount - allocatedAmount,
    status: input.status?.trim() || "draft",
    notes: emptyAsNull(input.notes),
    isActive: input.isActive ?? true,
    allocations,
  };
}

function normalizeBillingItem(item: Partial<BillingItemInput>, index: number) {
  const quantity = numberValue(item.quantity);
  const rate = numberValue(item.rate);
  const lineSubtotal = quantity * rate;
  const discountAmount =
    item.discountType === "percent"
      ? (lineSubtotal * numberValue(item.discountValue)) / 100
      : numberValue(item.discountAmount ?? item.discountValue);
  const taxableLine = lineSubtotal - discountAmount;
  const taxAmount = (taxableLine * numberValue(item.taxRate)) / 100;

  return {
    id: item.id ?? `entry-item:${randomUUID()}`,
    productId: emptyAsNull(item.productId),
    productName: requiredText(item.productName, "Product name is required."),
    productSku: emptyAsNull(item.productSku),
    poNo: emptyAsNull(item.poNo),
    dcNo: emptyAsNull(item.dcNo),
    description: emptyAsNull(item.description),
    size: emptyAsNull(item.size),
    colour: emptyAsNull(item.colour),
    areaSq: numberValue(item.areaSq),
    hsnCodeId: emptyAsNull(item.hsnCodeId),
    unitId: emptyAsNull(item.unitId),
    quantity,
    freeQuantity: numberValue(item.freeQuantity),
    rate,
    mrp: numberValue(item.mrp),
    discountType: emptyAsNull(item.discountType),
    discountValue: numberValue(item.discountValue),
    discountAmount,
    taxId: emptyAsNull(item.taxId),
    taxRate: numberValue(item.taxRate),
    taxAmount,
    lineSubtotal,
    lineTotal: taxableLine + taxAmount,
    sortOrder: Number(item.sortOrder ?? index + 1),
    isActive: item.isActive ?? true,
  };
}

function normalizeAllocation(item: Partial<AllocationInput>, index: number) {
  const previousBalance = numberValue(item.previousBalance);
  const allocatedAmount = numberValue(item.allocatedAmount);

  return {
    id: item.id ?? `entry-allocation:${randomUUID()}`,
    documentType: item.documentType?.trim() || "document",
    documentId: emptyAsNull(item.documentId),
    documentNo: item.documentNo?.trim() || "-",
    documentDate: dateOrNull(item.documentDate),
    documentTotal: numberValue(item.documentTotal),
    previousBalance,
    allocatedAmount,
    balanceAfterAllocation: previousBalance - allocatedAmount,
    sortOrder: Number(item.sortOrder ?? index + 1),
  };
}

function requiredText(value: string | null | undefined, message: string) {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) throw new Error(message);
  return trimmed;
}

function requiredIdentifier(value: string | null | undefined, message: string) {
  const trimmed = value?.trim() ?? "";
  if (!trimmed || !Number.isInteger(Number(trimmed)) || Number(trimmed) <= 0) {
    throw new Error(message);
  }
  return trimmed;
}

function emptyAsNull(value: string | null | undefined) {
  const trimmed = value?.trim() ?? "";
  return trimmed && trimmed !== "-" ? trimmed : null;
}

function numberValue(value: unknown) {
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? number : 0;
}

function dateOrNow(value: string | Date | null | undefined) {
  return value ? new Date(value) : new Date();
}

function dateOrNull(value: string | Date | null | undefined) {
  return value ? new Date(value) : null;
}
