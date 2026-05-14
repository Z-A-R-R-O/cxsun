import type { MasterListColumnOption, MasterListFilterOption } from "@cxnext/ui";

export interface PaymentAllocationInput {
  readonly documentType: string;
  readonly documentId: string | null;
  readonly documentNo: string;
  readonly documentDate: string | null;
  readonly documentTotal: number;
  readonly previousBalance: number;
  readonly allocatedAmount: number;
  readonly sortOrder: number;
}

export interface PaymentRecord {
  readonly id: number;
  readonly documentNo: string;
  readonly documentDate: string;
  readonly partyId: string | null;
  readonly partyName: string;
  readonly partyType: string | null;
  readonly ledgerId: string | null;
  readonly ledgerName: string | null;
  readonly mode: string;
  readonly bankAccountId: string | null;
  readonly referenceNo: string | null;
  readonly referenceDate: string | null;
  readonly amount: number;
  readonly tdsAmount: number;
  readonly discountAmount: number;
  readonly roundOff: number;
  readonly netAmount: number;
  readonly allocatedAmount: number;
  readonly unallocatedAmount: number;
  readonly status: string;
  readonly notes: string | null;
  readonly isActive: boolean;
  readonly updatedAt: string;
  readonly allocations: readonly PaymentAllocationInput[];
}

export interface PaymentInput {
  readonly autoDocumentNo?: boolean;
  readonly documentNo: string;
  readonly documentDate: string;
  readonly partyId: string | null;
  readonly partyName: string;
  readonly partyType: string | null;
  readonly ledgerId: string | null;
  readonly ledgerName: string | null;
  readonly mode: string;
  readonly bankAccountId: string | null;
  readonly referenceNo: string | null;
  readonly referenceDate: string | null;
  readonly amount: number;
  readonly tdsAmount: number;
  readonly discountAmount: number;
  readonly roundOff: number;
  readonly status: string;
  readonly notes: string | null;
  readonly isActive: boolean;
  readonly allocations: readonly PaymentAllocationInput[];
}

export type PaymentColumnId =
  | "documentNo"
  | "documentDate"
  | "party"
  | "mode"
  | "ledger"
  | "status"
  | "amount"
  | "unallocated"
  | "updated";

export type PaymentStatusFilter = "all" | "draft" | "posted" | "cancelled";
export type PaymentColumnOption = MasterListColumnOption;

export const paymentColumnCatalog: readonly {
  readonly id: PaymentColumnId;
  readonly label: string;
}[] = [
  { id: "documentNo", label: "Payment" },
  { id: "documentDate", label: "Date" },
  { id: "party", label: "Supplier" },
  { id: "mode", label: "Mode" },
  { id: "ledger", label: "Ledger" },
  { id: "status", label: "Status" },
  { id: "amount", label: "Amount" },
  { id: "unallocated", label: "Unallocated" },
  { id: "updated", label: "Updated" },
];

export const defaultPaymentColumnVisibility: Record<PaymentColumnId, boolean> = {
  documentNo: true,
  documentDate: true,
  party: true,
  mode: true,
  ledger: false,
  status: true,
  amount: true,
  unallocated: true,
  updated: false,
};

export const paymentStatusFilters: readonly MasterListFilterOption[] = [
  { id: "all", label: "All payments" },
  { id: "draft", label: "draft" },
  { id: "posted", label: "posted" },
  { id: "cancelled", label: "cancelled" },
];

export function defaultPaymentInput(): PaymentInput {
  return {
    documentNo: "",
    autoDocumentNo: true,
    documentDate: new Date().toISOString().slice(0, 10),
    partyId: null,
    partyName: "",
    partyType: "supplier",
    ledgerId: null,
    ledgerName: "Cash",
    mode: "cash",
    bankAccountId: null,
    referenceNo: null,
    referenceDate: null,
    amount: 0,
    tdsAmount: 0,
    discountAmount: 0,
    roundOff: 0,
    status: "draft",
    notes: null,
    isActive: true,
    allocations: [defaultPaymentAllocation()],
  };
}

export function defaultPaymentAllocation(): PaymentAllocationInput {
  return {
    documentType: "purchase",
    documentId: null,
    documentNo: "",
    documentDate: null,
    documentTotal: 0,
    previousBalance: 0,
    allocatedAmount: 0,
    sortOrder: 1,
  };
}
