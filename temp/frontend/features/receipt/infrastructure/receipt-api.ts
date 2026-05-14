import type { ReceiptInput, ReceiptRecord } from "../domain/receipt";
import { getRequiredApiUrl } from "@/lib/runtime-env";
import {
  authFetch,
  withStoredApplicationContextPayload,
  withStoredApplicationContextQuery,
} from "../../auth/infrastructure/auth-api";

export async function listReceipts(options?: { readonly signal?: AbortSignal }) {
  const response = await authFetch(
    withStoredApplicationContextQuery(`${apiBaseUrl()}/entries/receipt`),
    {
      cache: "no-store",
      headers: { Accept: "application/json" },
      signal: options?.signal,
    },
  );
  if (!response.ok) throw new Error(`Receipt list failed with status ${response.status}.`);
  return ((await response.json()) as Array<Omit<ReceiptRecord, "id"> & { id: string }>).map(
    toRecord,
  );
}

export async function getReceipt(id: number, options?: { readonly signal?: AbortSignal }) {
  const response = await authFetch(
    withStoredApplicationContextQuery(`${apiBaseUrl()}/entries/receipt/${id}`),
    {
      cache: "no-store",
      headers: { Accept: "application/json" },
      signal: options?.signal,
    },
  );
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Receipt detail failed with status ${response.status}.`);
  return toRecord((await response.json()) as Omit<ReceiptRecord, "id"> & { id: string });
}

export async function upsertReceipt(input: ReceiptInput, id?: number) {
  const response = await authFetch(`${apiBaseUrl()}/entries/receipt${id ? `/${id}` : ""}`, {
    body: JSON.stringify(withStoredApplicationContextPayload({ ...input })),
    cache: "no-store",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    method: id ? "PATCH" : "POST",
  });
  if (!response.ok) throw new Error(`Receipt save failed with status ${response.status}.`);
  return toRecord((await response.json()) as Omit<ReceiptRecord, "id"> & { id: string });
}

export async function deleteReceipt(id: number) {
  const response = await authFetch(
    withStoredApplicationContextQuery(`${apiBaseUrl()}/entries/receipt/${id}`),
    {
      cache: "no-store",
      headers: { Accept: "application/json" },
      method: "DELETE",
    },
  );
  if (!response.ok) throw new Error(`Receipt delete failed with status ${response.status}.`);
}

function apiBaseUrl() {
  return getRequiredApiUrl();
}

function toRecord(record: Omit<ReceiptRecord, "id"> & { id: string }): ReceiptRecord {
  return { ...record, id: Number(record.id) };
}
