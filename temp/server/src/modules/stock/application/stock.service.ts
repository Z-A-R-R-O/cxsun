import { Injectable, Logger, type OnModuleDestroy } from "@nestjs/common";
import { createDatabaseConnection, loadDatabaseEnv, type DatabaseConnection } from "@cxnext/db";
import type { Kysely } from "kysely";
import type { BillingEntryKind } from "../../entries/domain/entry-record";
import type {
  StockBalanceRecord,
  StockBillingEntryRecord,
  StockMovementRecord,
  StockWarehouseRecord,
} from "../domain/stock-record";

type DynamicDatabase = Record<string, Record<string, unknown>>;

@Injectable()
export class StockService implements OnModuleDestroy {
  private readonly connection: DatabaseConnection;
  private readonly logger = new Logger(StockService.name);

  public constructor() {
    this.connection = createDatabaseConnection(loadDatabaseEnv().env);
  }

  public async onModuleDestroy(): Promise<void> {
    await this.connection.destroy();
  }

  public async listWarehouses(companyId: string): Promise<readonly StockWarehouseRecord[]> {
    const rows = await this.db()
      .selectFrom("stock_warehouses")
      .selectAll()
      .where("company_id", "=", Number(companyId))
      .orderBy("is_default", "desc")
      .orderBy("name", "asc")
      .execute();
    return rows.map(toWarehouseRecord);
  }

  public async listBalances(params: {
    readonly companyId: string;
    readonly accountingYearId: string;
    readonly productId?: string | null;
  }): Promise<readonly StockBalanceRecord[]> {
    let query = this.db()
      .selectFrom("stock_balances as balance")
      .leftJoin("stock_warehouses as warehouse", "warehouse.id", "balance.warehouse_id")
      .leftJoin("products as product", "product.id", "balance.product_id")
      .select([
        "balance.company_id",
        "balance.accounting_year_id",
        "balance.product_id",
        "balance.warehouse_id",
        "balance.batch_id",
        "balance.quantity_on_hand",
        "balance.quantity_in",
        "balance.quantity_out",
        "balance.stock_value",
        "balance.updated_at",
        "warehouse.name as warehouse_name",
        "product.name as product_name",
        "product.sku as product_sku",
      ])
      .where("balance.company_id", "=", Number(params.companyId))
      .where("balance.accounting_year_id", "=", Number(params.accountingYearId))
      .orderBy("product.name", "asc");

    if (params.productId) {
      query = query.where("balance.product_id", "=", params.productId);
    }

    const rows = await query.execute();
    return rows.map(toBalanceRecord);
  }

  public async listMovements(params: {
    readonly companyId: string;
    readonly accountingYearId: string;
    readonly productId?: string | null;
    readonly limit?: number;
  }): Promise<readonly StockMovementRecord[]> {
    let query = this.db()
      .selectFrom("stock_movements as movement")
      .leftJoin("stock_warehouses as warehouse", "warehouse.id", "movement.warehouse_id")
      .leftJoin("products as product", "product.id", "movement.product_id")
      .select([
        "movement.id",
        "movement.company_id",
        "movement.accounting_year_id",
        "movement.product_id",
        "movement.warehouse_id",
        "movement.source_type",
        "movement.source_id",
        "movement.source_item_id",
        "movement.movement_date",
        "movement.direction",
        "movement.quantity",
        "movement.unit_cost",
        "movement.amount",
        "warehouse.name as warehouse_name",
        "product.name as product_name",
      ])
      .where("movement.company_id", "=", Number(params.companyId))
      .where("movement.accounting_year_id", "=", Number(params.accountingYearId))
      .orderBy("movement.movement_date", "desc")
      .orderBy("movement.id", "desc")
      .limit(normalizeLimit(params.limit));

    if (params.productId) {
      query = query.where("movement.product_id", "=", params.productId);
    }

    const rows = await query.execute();
    return rows.map(toMovementRecord);
  }

  public async syncBillingEntry(kind: BillingEntryKind, entry: StockBillingEntryRecord) {
    try {
      await this.replaceBillingMovements(kind, entry);
    } catch (error) {
      if (isMissingStockTableError(error)) {
        this.logger.warn(
          "Stock tables are missing. Run database migrations to enable stock updates from billing entries.",
        );
        return;
      }
      throw error;
    }
  }

  public async voidBillingEntry(kind: BillingEntryKind, entry: StockBillingEntryRecord) {
    try {
      await this.deleteSourceMovements(sourceType(kind), entry.id);
      await this.recalculateEntryBalances(entry);
    } catch (error) {
      if (isMissingStockTableError(error)) {
        this.logger.warn(
          "Stock tables are missing. Run database migrations to enable stock updates from billing entries.",
        );
        return;
      }
      throw error;
    }
  }

  private async replaceBillingMovements(kind: BillingEntryKind, entry: StockBillingEntryRecord) {
    const warehouseId = await this.ensureDefaultWarehouse(entry.companyId);
    await this.deleteSourceMovements(sourceType(kind), entry.id);

    const movementRows = entry.items
      .map((item) => {
        const quantity = Math.max(0, Number(item.quantity ?? 0) + Number(item.freeQuantity ?? 0));
        if (!item.productId || quantity <= 0) {
          return null;
        }
        const direction = kind === "purchase" ? "in" : "out";
        const unitCost = Number(item.rate ?? 0);
        return {
          company_id: Number(entry.companyId),
          accounting_year_id: Number(entry.accountingYearId),
          product_id: item.productId,
          warehouse_id: warehouseId,
          batch_id: null,
          serial_id: null,
          barcode_id: null,
          source_type: sourceType(kind),
          source_id: entry.id,
          source_item_id: item.id,
          movement_date: entry.documentDate,
          direction,
          quantity,
          unit_cost: unitCost,
          amount: quantity * unitCost,
          remarks: `${kind === "purchase" ? "Purchase" : "Sales"} ${entry.documentNo}`,
          created_at: new Date(),
        };
      })
      .filter((row): row is NonNullable<typeof row> => row !== null);

    if (movementRows.length > 0) {
      await this.db().insertInto("stock_movements").values(movementRows).execute();
    }

    await this.recalculateEntryBalances(entry);
  }

  private async ensureDefaultWarehouse(companyId: string) {
    const existing = await this.db()
      .selectFrom("stock_warehouses")
      .selectAll()
      .where("company_id", "=", Number(companyId))
      .where("is_default", "=", true)
      .executeTakeFirst();

    if (existing?.id) {
      return Number(existing.id);
    }

    const inserted = await this.db()
      .insertInto("stock_warehouses")
      .values({
        company_id: Number(companyId),
        code: "MAIN",
        name: "Main Warehouse",
        common_warehouse_id: null,
        address: null,
        is_default: true,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      })
      .executeTakeFirstOrThrow();

    return Number(inserted.insertId);
  }

  private async deleteSourceMovements(source: string, sourceId: string) {
    await this.db()
      .deleteFrom("stock_movements")
      .where("source_type", "=", source)
      .where("source_id", "=", sourceId)
      .execute();
  }

  private async recalculateEntryBalances(entry: StockBillingEntryRecord) {
    const productIds = [...new Set(entry.items.map((item) => item.productId).filter(Boolean))];
    for (const productId of productIds) {
      await this.recalculateProductBalances(entry.companyId, entry.accountingYearId, String(productId));
    }
  }

  private async recalculateProductBalances(
    companyId: string,
    accountingYearId: string,
    productId: string,
  ) {
    const movements = await this.db()
      .selectFrom("stock_movements")
      .select(["warehouse_id", "batch_id", "direction", "quantity", "amount"])
      .where("company_id", "=", Number(companyId))
      .where("accounting_year_id", "=", Number(accountingYearId))
      .where("product_id", "=", productId)
      .execute();

    const grouped = new Map<
      string,
      {
        warehouseId: number;
        batchId: number;
        quantityIn: number;
        quantityOut: number;
        stockValue: number;
      }
    >();

    for (const movement of movements) {
      const warehouseId = Number(movement.warehouse_id);
      const batchId = Number(movement.batch_id ?? 0);
      const key = `${warehouseId}:${batchId}`;
      const current =
        grouped.get(key) ??
        ({ warehouseId, batchId, quantityIn: 0, quantityOut: 0, stockValue: 0 } satisfies {
          warehouseId: number;
          batchId: number;
          quantityIn: number;
          quantityOut: number;
          stockValue: number;
        });
      const quantity = Number(movement.quantity ?? 0);
      const amount = Number(movement.amount ?? 0);
      if (movement.direction === "in") {
        current.quantityIn += quantity;
        current.stockValue += amount;
      } else {
        current.quantityOut += quantity;
        current.stockValue -= amount;
      }
      grouped.set(key, current);
    }

    await this.db()
      .deleteFrom("stock_balances")
      .where("company_id", "=", Number(companyId))
      .where("accounting_year_id", "=", Number(accountingYearId))
      .where("product_id", "=", productId)
      .execute();

    const rows = [...grouped.values()].map((balance) => ({
      company_id: Number(companyId),
      accounting_year_id: Number(accountingYearId),
      product_id: productId,
      warehouse_id: balance.warehouseId,
      batch_id: balance.batchId,
      quantity_on_hand: balance.quantityIn - balance.quantityOut,
      quantity_in: balance.quantityIn,
      quantity_out: balance.quantityOut,
      stock_value: balance.stockValue,
      updated_at: new Date(),
    }));

    if (rows.length > 0) {
      await this.db().insertInto("stock_balances").values(rows).execute();
    }
  }

  private db(): Kysely<DynamicDatabase> {
    return this.connection.db as unknown as Kysely<DynamicDatabase>;
  }
}

function sourceType(kind: BillingEntryKind) {
  return kind === "purchase" ? "purchase" : "sales";
}

function toWarehouseRecord(row: Record<string, unknown>): StockWarehouseRecord {
  return {
    id: String(row.id),
    companyId: String(row.company_id),
    code: String(row.code),
    name: String(row.name),
    commonWarehouseId: stringOrNull(row.common_warehouse_id),
    isDefault: Boolean(row.is_default),
    isActive: Boolean(row.is_active),
  };
}

function toBalanceRecord(row: Record<string, unknown>): StockBalanceRecord {
  return {
    companyId: String(row.company_id),
    accountingYearId: String(row.accounting_year_id),
    productId: String(row.product_id),
    productName: stringOrNull(row.product_name),
    productSku: stringOrNull(row.product_sku),
    warehouseId: String(row.warehouse_id),
    warehouseName: String(row.warehouse_name ?? "Warehouse"),
    batchId: Number(row.batch_id ?? 0) > 0 ? String(row.batch_id) : null,
    quantityOnHand: numberValue(row.quantity_on_hand),
    quantityIn: numberValue(row.quantity_in),
    quantityOut: numberValue(row.quantity_out),
    stockValue: numberValue(row.stock_value),
    updatedAt: toIso(row.updated_at),
  };
}

function toMovementRecord(row: Record<string, unknown>): StockMovementRecord {
  return {
    id: String(row.id),
    companyId: String(row.company_id),
    accountingYearId: String(row.accounting_year_id),
    productId: String(row.product_id),
    productName: stringOrNull(row.product_name),
    warehouseId: String(row.warehouse_id),
    warehouseName: String(row.warehouse_name ?? "Warehouse"),
    sourceType: String(row.source_type),
    sourceId: String(row.source_id),
    sourceItemId: stringOrNull(row.source_item_id),
    movementDate: toIso(row.movement_date),
    direction: row.direction === "in" ? "in" : "out",
    quantity: numberValue(row.quantity),
    unitCost: numberValue(row.unit_cost),
    amount: numberValue(row.amount),
  };
}

function normalizeLimit(value: number | undefined) {
  if (!Number.isFinite(value)) {
    return 50;
  }
  return Math.min(200, Math.max(1, Math.trunc(value ?? 50)));
}

function stringOrNull(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function numberValue(value: unknown) {
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? number : 0;
}

function toIso(value: unknown) {
  return (value instanceof Date ? value : new Date(value as string)).toISOString();
}

function isMissingStockTableError(error: unknown) {
  if (!error || typeof error !== "object") {
    return false;
  }
  const candidate = error as { code?: unknown; message?: unknown; sqlMessage?: unknown };
  const message = `${String(candidate.message ?? "")} ${String(candidate.sqlMessage ?? "")}`;
  return candidate.code === "ER_NO_SUCH_TABLE" && message.includes("stock_");
}
