import { getRequiredApiUrl } from "@/lib/runtime-env";
import { authFetch, withStoredApplicationContextQuery } from "../../auth/infrastructure/auth-api";
import type {
  StockBalanceRecord,
  StockMovementRecord,
  StockWarehouseRecord,
} from "../domain/stock";

export async function listStockBalances(options?: { readonly signal?: AbortSignal }) {
  const response = await authFetch(withStoredApplicationContextQuery(`${apiBaseUrl()}/stock/balances`), {
    cache: "no-store",
    headers: { Accept: "application/json" },
    signal: options?.signal,
  });
  if (!response.ok) throw new Error(`Stock balance request failed with status ${response.status}.`);
  return (await response.json()) as StockBalanceRecord[];
}

export async function listStockMovements(options?: { readonly signal?: AbortSignal }) {
  const url = new URL(withStoredApplicationContextQuery(`${apiBaseUrl()}/stock/movements`));
  url.searchParams.set("limit", "25");
  const response = await authFetch(url.toString(), {
    cache: "no-store",
    headers: { Accept: "application/json" },
    signal: options?.signal,
  });
  if (!response.ok) throw new Error(`Stock movement request failed with status ${response.status}.`);
  return (await response.json()) as StockMovementRecord[];
}

export async function listStockWarehouses(options?: { readonly signal?: AbortSignal }) {
  const url = new URL(withStoredApplicationContextQuery(`${apiBaseUrl()}/stock/warehouses`));
  url.searchParams.delete("accountingYearId");
  const response = await authFetch(url.toString(), {
    cache: "no-store",
    headers: { Accept: "application/json" },
    signal: options?.signal,
  });
  if (!response.ok) throw new Error(`Stock warehouse request failed with status ${response.status}.`);
  return (await response.json()) as StockWarehouseRecord[];
}

function apiBaseUrl() {
  return getRequiredApiUrl();
}
