import type { PurchaseInput, PurchaseRecord } from "../domain/purchase";
import { getRequiredApiUrl } from "@/lib/runtime-env";
import {
  authFetch,
  withStoredApplicationContextPayload,
  withStoredApplicationContextQuery,
} from "../../auth/infrastructure/auth-api";

type ApiRecord = Omit<PurchaseRecord, "id"> & { readonly id: string };

export async function listPurchase(options?: { readonly signal?: AbortSignal }) {
  const response = await authFetch(
    withStoredApplicationContextQuery(`${apiBaseUrl()}/entries/purchase`),
    {
      cache: "no-store",
      headers: { Accept: "application/json" },
      signal: options?.signal,
    },
  );
  if (!response.ok) throw new Error(`Purchase list failed with status ${response.status}.`);
  return ((await response.json()) as ApiRecord[]).map(toRecord);
}

export async function getPurchase(id: number) {
  const response = await authFetch(
    withStoredApplicationContextQuery(`${apiBaseUrl()}/entries/purchase/${id}`),
    {
      cache: "no-store",
      headers: { Accept: "application/json" },
    },
  );
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Purchase detail failed with status ${response.status}.`);
  return toRecord((await response.json()) as ApiRecord);
}

export async function upsertPurchase(input: PurchaseInput, id?: number) {
  const response = await authFetch(`${apiBaseUrl()}/entries/purchase${id ? `/${id}` : ""}`, {
    body: JSON.stringify(withStoredApplicationContextPayload({ ...input })),
    cache: "no-store",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    method: id ? "PATCH" : "POST",
  });
  if (!response.ok) throw new Error(`Purchase save failed with status ${response.status}.`);
  return toRecord((await response.json()) as ApiRecord);
}

export async function deletePurchase(id: number) {
  const response = await authFetch(
    withStoredApplicationContextQuery(`${apiBaseUrl()}/entries/purchase/${id}`),
    {
      method: "DELETE",
      headers: { Accept: "application/json" },
    },
  );
  if (!response.ok) throw new Error(`Purchase delete failed with status ${response.status}.`);
}

function apiBaseUrl() {
  return getRequiredApiUrl();
}

function toRecord(record: ApiRecord): PurchaseRecord {
  return { ...record, id: Number(record.id) };
}
