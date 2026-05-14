export type BillingEntryKind = "sales" | "purchase";
export type MoneyEntryKind = "payment" | "receipt";
export type EntryKind = BillingEntryKind | MoneyEntryKind;

export interface BillingItemRecord {
  readonly id: string;
  readonly parentId: string;
  readonly productId: string | null;
  readonly productName: string;
  readonly productSku: string | null;
  readonly poNo: string | null;
  readonly dcNo: string | null;
  readonly description: string | null;
  readonly size: string | null;
  readonly colour: string | null;
  readonly areaSq: number;
  readonly hsnCodeId: string | null;
  readonly unitId: string | null;
  readonly quantity: number;
  readonly freeQuantity: number;
  readonly rate: number;
  readonly mrp: number;
  readonly discountType: string | null;
  readonly discountValue: number;
  readonly discountAmount: number;
  readonly taxId: string | null;
  readonly taxRate: number;
  readonly taxAmount: number;
  readonly lineSubtotal: number;
  readonly lineTotal: number;
  readonly sortOrder: number;
  readonly isActive: boolean;
}

export interface BillingEntryRecord {
  readonly id: string;
  readonly uuid: string;
  readonly kind: BillingEntryKind;
  readonly companyId: string;
  readonly accountingYearId: string;
  readonly documentNo: string;
  readonly documentDate: Date;
  readonly partyId: string | null;
  readonly partyName: string;
  readonly billingAddress: string | null;
  readonly shippingAddress: string | null;
  readonly placeOfSupply: string | null;
  readonly priceListId: string | null;
  readonly referenceNo: string | null;
  readonly dueDate: Date | null;
  readonly ewayBillNo: string | null;
  readonly ewayBillDate: Date | null;
  readonly eInvoiceIrn: string | null;
  readonly eInvoiceAckNo: string | null;
  readonly eInvoiceAckDate: Date | null;
  readonly eInvoiceSignedQr: string | null;
  readonly supplierInvoiceNo: string | null;
  readonly supplierInvoiceDate: Date | null;
  readonly subtotal: number;
  readonly discountTotal: number;
  readonly taxableTotal: number;
  readonly taxTotal: number;
  readonly roundOff: number;
  readonly grandTotal: number;
  readonly paidAmount: number;
  readonly balanceAmount: number;
  readonly status: string;
  readonly paymentStatus: string;
  readonly notes: string | null;
  readonly terms: string | null;
  readonly isActive: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly deletedAt: Date | null;
  readonly items: readonly BillingItemRecord[];
}

export interface AllocationRecord {
  readonly id: string;
  readonly parentId: string;
  readonly documentType: string;
  readonly documentId: string | null;
  readonly documentNo: string;
  readonly documentDate: Date | null;
  readonly documentTotal: number;
  readonly previousBalance: number;
  readonly allocatedAmount: number;
  readonly balanceAfterAllocation: number;
  readonly sortOrder: number;
}

export interface MoneyEntryRecord {
  readonly id: string;
  readonly uuid: string;
  readonly kind: MoneyEntryKind;
  readonly companyId: string;
  readonly accountingYearId: string;
  readonly documentNo: string;
  readonly documentDate: Date;
  readonly partyId: string | null;
  readonly partyName: string;
  readonly partyType: string | null;
  readonly ledgerId: string | null;
  readonly ledgerName: string | null;
  readonly mode: string;
  readonly bankAccountId: string | null;
  readonly referenceNo: string | null;
  readonly referenceDate: Date | null;
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
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly deletedAt: Date | null;
  readonly allocations: readonly AllocationRecord[];
}
