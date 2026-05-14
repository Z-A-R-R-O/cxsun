export interface StockWarehouseRecord {
  readonly id: string;
  readonly code: string;
  readonly name: string;
  readonly isDefault: boolean;
  readonly isActive: boolean;
}

export interface StockBalanceRecord {
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
  readonly productId: string;
  readonly productName: string | null;
  readonly warehouseId: string;
  readonly warehouseName: string;
  readonly sourceType: string;
  readonly sourceId: string;
  readonly movementDate: string;
  readonly direction: "in" | "out";
  readonly quantity: number;
  readonly unitCost: number;
  readonly amount: number;
}
