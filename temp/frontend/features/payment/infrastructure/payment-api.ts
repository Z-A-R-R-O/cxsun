import type { PaymentInput, PaymentRecord } from "../domain/payment";
import { getRequiredApiUrl } from "@/lib/runtime-env";
import {
  authFetch,
  withStoredApplicationContextPayload,
  withStoredApplicationContextQuery,
} from "../../auth/infrastructure/auth-api";

export async function listPayments(options?: { readonly signal?: AbortSignal }) {
  const response = await authFetch(
    withStoredApplicationContextQuery(`${apiBaseUrl()}/entries/payment`),
    {
      cache: "no-store",
      headers: { Accept: "application/json" },
      signal: options?.signal,
    },
  );
  if (!response.ok) throw new Error(`Payment list failed with status ${response.status}.`);
  return ((await response.json()) as Array<Omit<PaymentRecord, "id"> & { id: string }>).map(
    toRecord,
  );
}

export async function getPayment(id: number, options?: { readonly signal?: AbortSignal }) {
  const response = await authFetch(
    withStoredApplicationContextQuery(`${apiBaseUrl()}/entries/payment/${id}`),
    {
      cache: "no-store",
      headers: { Accept: "application/json" },
      signal: options?.signal,
    },
  );
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Payment detail failed with status ${response.status}.`);
  return toRecord((await response.json()) as Omit<PaymentRecord, "id"> & { id: string });
}

export async function upsertPayment(input: PaymentInput, id?: number) {
  const response = await authFetch(`${apiBaseUrl()}/entries/payment${id ? `/${id}` : ""}`, {
    body: JSON.stringify(withStoredApplicationContextPayload({ ...input })),
    cache: "no-store",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    method: id ? "PATCH" : "POST",
  });
  if (!response.ok) throw new Error(`Payment save failed with status ${response.status}.`);
  return toRecord((await response.json()) as Omit<PaymentRecord, "id"> & { id: string });
}

export async function deletePayment(id: number) {
  const response = await authFetch(
    withStoredApplicationContextQuery(`${apiBaseUrl()}/entries/payment/${id}`),
    {
      cache: "no-store",
      headers: { Accept: "application/json" },
      method: "DELETE",
    },
  );
  if (!response.ok) throw new Error(`Payment delete failed with status ${response.status}.`);
}

function apiBaseUrl() {
  return getRequiredApiUrl();
}

function toRecord(record: Omit<PaymentRecord, "id"> & { id: string }): PaymentRecord {
  return { ...record, id: Number(record.id) };
}
