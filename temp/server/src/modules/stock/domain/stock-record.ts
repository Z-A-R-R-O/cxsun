import type { BillingEntryRecord } from "../../entries/domain/entry-record";

export interface StockWarehouseRecord {
  readonly id: string;
  readonly companyId: string;
  readonly code: string;
  readonly name: string;
  readonly commonWarehouseId: string | null;
  readonly isDefault: boolean;
  readonly isActive: boolean;
}

export interface StockBalanceRecord {
  readonly companyId: string;
  readonly accountingYearId: string;
  readonly productId: string;
  readonly productName: string | null;
  readonly productSku: string | null;
  readonly warehouseId: string;
  readonly warehouseName: string;
  readonly batchId: string | null;
  readonly quantityOnHand: number;
  readonly quantityIn: number;
  readonly quantityOut: number;
  readonly stockValue: number;
  readonly updatedAt: string;
}

export interface StockMovementRecord {
  readonly id: string;
  readonly companyId: string;
  readonly accountingYearId: string;
  readonly productId: string;
  readonly productName: string | null;
  readonly warehouseId: string;
  readonly warehouseName: string;
  readonly sourceType: string;
  readonly sourceId: string;
  readonly sourceItemId: string | null;
  readonly movementDate: string;
  readonly direction: "in" | "out";
  readonly quantity: number;
  readonly unitCost: number;
  readonly amount: number;
}

export type StockBillingEntryRecord = BillingEntryRecord;
