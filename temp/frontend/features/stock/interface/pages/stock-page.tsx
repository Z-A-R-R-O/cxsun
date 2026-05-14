"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowDownLeft, ArrowUpRight, RefreshCcw, Warehouse } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Separator,
} from "@cxnext/ui";
import type {
  StockBalanceRecord,
  StockMovementRecord,
  StockWarehouseRecord,
} from "../../domain/stock";
import {
  listStockBalances,
  listStockMovements,
  listStockWarehouses,
} from "../../infrastructure/stock-api";

export function StockPage() {
  const [balances, setBalances] = useState<readonly StockBalanceRecord[]>([]);
  const [movements, setMovements] = useState<readonly StockMovementRecord[]>([]);
  const [warehouses, setWarehouses] = useState<readonly StockWarehouseRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  async function load(signal?: AbortSignal) {
    setIsLoading(true);
    setError(null);
    try {
      const [nextBalances, nextMovements, nextWarehouses] = await Promise.all([
        listStockBalances({ signal }),
        listStockMovements({ signal }),
        listStockWarehouses({ signal }),
      ]);
      setBalances(nextBalances);
      setMovements(nextMovements);
      setWarehouses(nextWarehouses);
    } catch (caught) {
      if (signal?.aborted) return;
      setError(caught instanceof Error ? caught.message : "Stock could not be loaded.");
    } finally {
      if (!signal?.aborted) setIsLoading(false);
    }
  }

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, []);

  const totals = useMemo(
    () => ({
      products: new Set(balances.map((item) => item.productId)).size,
      quantity: balances.reduce((sum, item) => sum + item.quantityOnHand, 0),
      value: balances.reduce((sum, item) => sum + item.stockValue, 0),
    }),
    [balances],
  );

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-5 py-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal">Stock</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Warehouse balances from purchase and sales billing movements.
          </p>
        </div>
        <Button disabled={isLoading} onClick={() => void load()} variant="outline">
          <RefreshCcw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      {error ? (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <div className="grid gap-3 md:grid-cols-3">
        <MetricCard label="Products in stock" value={totals.products.toLocaleString()} />
        <MetricCard label="Quantity on hand" value={formatQuantity(totals.quantity)} />
        <MetricCard label="Stock value" value={formatMoney(totals.value)} />
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_0.8fr]">
        <Card>
          <CardHeader>
            <CardTitle>Balances</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px] text-sm">
                <thead className="border-b text-left text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="py-2 pr-3 font-medium">Product</th>
                    <th className="py-2 pr-3 font-medium">Warehouse</th>
                    <th className="py-2 pr-3 text-right font-medium">In</th>
                    <th className="py-2 pr-3 text-right font-medium">Out</th>
                    <th className="py-2 pr-3 text-right font-medium">On hand</th>
                    <th className="py-2 text-right font-medium">Value</th>
                  </tr>
                </thead>
                <tbody>
                  {balances.map((item) => (
                    <tr key={`${item.productId}-${item.warehouseId}-${item.batchId ?? "batch"}`} className="border-b last:border-0">
                      <td className="py-3 pr-3">
                        <div className="font-medium">{item.productName ?? `Product ${item.productId}`}</div>
                        <div className="text-xs text-muted-foreground">{item.productSku ?? item.productId}</div>
                      </td>
                      <td className="py-3 pr-3">{item.warehouseName}</td>
                      <td className="py-3 pr-3 text-right">{formatQuantity(item.quantityIn)}</td>
                      <td className="py-3 pr-3 text-right">{formatQuantity(item.quantityOut)}</td>
                      <td className="py-3 pr-3 text-right font-medium">{formatQuantity(item.quantityOnHand)}</td>
                      <td className="py-3 text-right">{formatMoney(item.stockValue)}</td>
                    </tr>
                  ))}
                  {!isLoading && balances.length === 0 ? (
                    <tr>
                      <td className="py-8 text-center text-muted-foreground" colSpan={6}>
                        No stock movements yet.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-5">
          <Card>
            <CardHeader>
              <CardTitle>Warehouses</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {warehouses.map((warehouse) => (
                <div key={warehouse.id} className="flex items-center justify-between gap-3 rounded-md border px-3 py-2">
                  <div className="flex items-center gap-2">
                    <Warehouse className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="text-sm font-medium">{warehouse.name}</div>
                      <div className="text-xs text-muted-foreground">{warehouse.code}</div>
                    </div>
                  </div>
                  {warehouse.isDefault ? <Badge variant="secondary">Default</Badge> : null}
                </div>
              ))}
              {!isLoading && warehouses.length === 0 ? (
                <p className="text-sm text-muted-foreground">A default warehouse will be created on the first stock movement.</p>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent Movements</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {movements.map((movement, index) => (
                <div key={movement.id}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex gap-2">
                      {movement.direction === "in" ? (
                        <ArrowDownLeft className="mt-0.5 h-4 w-4 text-emerald-600" />
                      ) : (
                        <ArrowUpRight className="mt-0.5 h-4 w-4 text-rose-600" />
                      )}
                      <div>
                        <div className="text-sm font-medium">{movement.productName ?? movement.productId}</div>
                        <div className="text-xs text-muted-foreground">
                          {movement.sourceType} #{movement.sourceId} / {movement.warehouseName}
                        </div>
                      </div>
                    </div>
                    <div className="text-right text-sm font-medium">
                      {movement.direction === "in" ? "+" : "-"}
                      {formatQuantity(movement.quantity)}
                    </div>
                  </div>
                  {index < movements.length - 1 ? <Separator className="mt-3" /> : null}
                </div>
              ))}
              {!isLoading && movements.length === 0 ? (
                <p className="text-sm text-muted-foreground">No stock movements have been posted yet.</p>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-xs uppercase text-muted-foreground">{label}</div>
        <div className="mt-2 text-2xl font-semibold tracking-normal">{value}</div>
      </CardContent>
    </Card>
  );
}

function formatQuantity(value: number) {
  return value.toLocaleString(undefined, { maximumFractionDigits: 3 });
}

function formatMoney(value: number) {
  return value.toLocaleString(undefined, {
    currency: "INR",
    maximumFractionDigits: 2,
    style: "currency",
  });
}
