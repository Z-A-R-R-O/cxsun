import type { SalesInput, SalesRecord } from "../domain/sales";
import { getRequiredApiUrl } from "@/lib/runtime-env";
import {
  authFetch,
  withStoredApplicationContextPayload,
  withStoredApplicationContextQuery,
} from "../../auth/infrastructure/auth-api";

export async function listSales(options?: { readonly signal?: AbortSignal }) {
  const response = await authFetch(
    withStoredApplicationContextQuery(`${apiBaseUrl()}/entries/sales`),
    {
      cache: "no-store",
      headers: { Accept: "application/json" },
      signal: options?.signal,
    },
  );
  if (!response.ok) throw new Error(`Sales list failed with status ${response.status}.`);
  return ((await response.json()) as Array<Omit<SalesRecord, "id"> & { id: string }>).map(toRecord);
}

export async function getSales(id: number, options?: { readonly signal?: AbortSignal }) {
  const response = await authFetch(
    withStoredApplicationContextQuery(`${apiBaseUrl()}/entries/sales/${id}`),
    {
      cache: "no-store",
      headers: { Accept: "application/json" },
      signal: options?.signal,
    },
  );
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(await readSalesApiError(response, "Sales detail"));
  return toRecord((await response.json()) as Omit<SalesRecord, "id"> & { id: string });
}

export async function upsertSales(input: SalesInput, id?: number) {
  const response = await authFetch(`${apiBaseUrl()}/entries/sales${id ? `/${id}` : ""}`, {
    body: JSON.stringify(withStoredApplicationContextPayload({ ...input })),
    cache: "no-store",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    method: id ? "PATCH" : "POST",
  });
  if (!response.ok) throw new Error(await readSalesApiError(response, "Sales save"));
  return toRecord((await response.json()) as Omit<SalesRecord, "id"> & { id: string });
}

export async function deleteSales(id: number) {
  const response = await authFetch(
    withStoredApplicationContextQuery(`${apiBaseUrl()}/entries/sales/${id}`),
    {
      cache: "no-store",
      headers: { Accept: "application/json" },
      method: "DELETE",
    },
  );
  if (!response.ok) throw new Error(await readSalesApiError(response, "Sales delete"));
}

function apiBaseUrl() {
  return getRequiredApiUrl();
}

function toRecord(record: Omit<SalesRecord, "id"> & { id: string }): SalesRecord {
  return { ...record, id: Number(record.id) };
}

async function readSalesApiError(response: Response, action: string) {
  const fallback = `${action} failed with status ${response.status}.`;
  const textFallbackResponse = response.clone();

  try {
    const body = (await response.json()) as {
      readonly message?: unknown;
      readonly error?: unknown;
      readonly detail?: unknown;
    };
    const message = Array.isArray(body.message) ? body.message.join(", ") : body.message;
    const detail = body.detail ?? body.error;
    const parts = [message, detail]
      .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
      .map((value) => value.trim());

    return parts.length ? `${fallback} ${parts.join(" ")}` : fallback;
  } catch {
    try {
      const text = await textFallbackResponse.text();
      return text.trim() ? `${fallback} ${text.trim()}` : fallback;
    } catch {
      return fallback;
    }
  }
}
