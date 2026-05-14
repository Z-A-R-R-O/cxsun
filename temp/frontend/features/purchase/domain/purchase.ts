import type { MasterListColumnOption, MasterListFilterOption } from "@cxnext/ui";

export interface PurchaseItemInput {
  readonly productName: string;
  readonly productId: string | null;
  readonly productSku: string | null;
  readonly poNo: string | null;
  readonly dcNo: string | null;
  readonly description: string | null;
  readonly size: string | null;
  readonly colour: string | null;
  readonly areaSq: number;
  readonly quantity: number;
  readonly rate: number;
  readonly taxRate: number;
  readonly freeQuantity: number;
  readonly mrp: number;
  readonly discountType: string | null;
  readonly discountValue: number;
  readonly discountAmount: number;
  readonly taxId: string | null;
  readonly taxAmount: number;
  readonly hsnCodeId: string | null;
  readonly unitId: string | null;
  readonly sortOrder: number;
  readonly isActive: boolean;
}

export interface PurchaseRecord {
  readonly id: number;
  readonly documentNo: string;
  readonly documentDate: string;
  readonly partyName: string;
  readonly partyId: string | null;
  readonly supplierInvoiceNo: string | null;
  readonly supplierInvoiceDate: string | null;
  readonly billingAddress: string | null;
  readonly placeOfSupply: string | null;
  readonly referenceNo: string | null;
  readonly dueDate: string | null;
  readonly roundOff: number;
  readonly grandTotal: number;
  readonly balanceAmount: number;
  readonly status: string;
  readonly paymentStatus: string;
  readonly notes: string | null;
  readonly terms: string | null;
  readonly isActive: boolean;
  readonly updatedAt: string;
  readonly items: readonly PurchaseItemInput[];
}

export interface PurchaseInput {
  readonly autoDocumentNo?: boolean;
  readonly documentNo: string;
  readonly documentDate: string;
  readonly partyName: string;
  readonly partyId: string | null;
  readonly supplierInvoiceNo: string | null;
  readonly supplierInvoiceDate: string | null;
  readonly billingAddress: string | null;
  readonly placeOfSupply: string | null;
  readonly referenceNo: string | null;
  readonly dueDate: string | null;
  readonly roundOff: number;
  readonly status: string;
  readonly paymentStatus: string;
  readonly notes: string | null;
  readonly terms: string | null;
  readonly isActive: boolean;
  readonly items: readonly PurchaseItemInput[];
}

export type PurchaseColumnId =
  | "documentNo"
  | "documentDate"
  | "party"
  | "supplierInvoice"
  | "status"
  | "paymentStatus"
  | "total"
  | "balance"
  | "updated";

export type PurchaseStatusFilter = "all" | "draft" | "posted" | "cancelled";
export type PurchaseColumnOption = MasterListColumnOption;

export const purchaseColumnCatalog: readonly {
  readonly id: PurchaseColumnId;
  readonly label: string;
}[] = [
  { id: "documentNo", label: "Entry no" },
  { id: "documentDate", label: "Entry date" },
  { id: "party", label: "Supplier" },
  { id: "supplierInvoice", label: "Supplier bill no" },
  { id: "status", label: "Status" },
  { id: "paymentStatus", label: "Payment" },
  { id: "total", label: "Total" },
  { id: "balance", label: "Balance" },
  { id: "updated", label: "Updated" },
];

export const defaultPurchaseColumnVisibility: Record<PurchaseColumnId, boolean> = {
  documentNo: true,
  documentDate: true,
  party: true,
  supplierInvoice: true,
  status: true,
  paymentStatus: true,
  total: true,
  balance: false,
  updated: false,
};

export const purchaseStatusFilters: readonly MasterListFilterOption[] = [
  { id: "all", label: "All purchases" },
  { id: "draft", label: "draft" },
  { id: "posted", label: "posted" },
  { id: "cancelled", label: "cancelled" },
];

export function defaultPurchaseItem(): PurchaseItemInput {
  return {
    productName: "",
    productId: null,
    productSku: null,
    poNo: null,
    dcNo: null,
    description: null,
    size: null,
    colour: null,
    areaSq: 0,
    quantity: 1,
    rate: 0,
    taxRate: 0,
    freeQuantity: 0,
    mrp: 0,
    discountType: null,
    discountValue: 0,
    discountAmount: 0,
    taxId: null,
    taxAmount: 0,
    hsnCodeId: null,
    unitId: null,
    sortOrder: 1,
    isActive: true,
  };
}

export function defaultPurchaseInput(): PurchaseInput {
  return {
    documentNo: "",
    autoDocumentNo: true,
    documentDate: new Date().toISOString().slice(0, 10),
    partyName: "",
    partyId: null,
    supplierInvoiceNo: null,
    supplierInvoiceDate: null,
    billingAddress: null,
    placeOfSupply: null,
    referenceNo: null,
    dueDate: null,
    roundOff: 0,
    status: "draft",
    paymentStatus: "unpaid",
    notes: null,
    terms: null,
    isActive: true,
    items: [defaultPurchaseItem()],
  };
}
