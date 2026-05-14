import type { TenantRecord, TenantUpsertInput } from "../domain/tenant";
import { getRequiredApiUrl } from "@/lib/runtime-env";
import { authFetch } from "../../auth/infrastructure/auth-api";

interface TenantApiRecord {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly isActive: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly deletedAt: string | null;
}

export async function listTenants(options?: { readonly signal?: AbortSignal }) {
  const response = await authFetch(`${getApiBaseUrl()}/tenants`, {
    cache: "no-store",
    headers: {
      Accept: "application/json",
    },
    signal: options?.signal,
  });

  if (!response.ok) {
    throw new Error(`Tenant list request failed with status ${response.status}.`);
  }

  const records = (await response.json()) as TenantApiRecord[];
  return records.map(toTenantRecord);
}

export async function getTenant(tenantId: number, options?: { readonly signal?: AbortSignal }) {
  const response = await authFetch(`${getApiBaseUrl()}/tenants/${tenantId}`, {
    cache: "no-store",
    headers: {
      Accept: "application/json",
    },
    signal: options?.signal,
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`Tenant detail request failed with status ${response.status}.`);
  }

  return toTenantRecord((await response.json()) as TenantApiRecord);
}

export async function upsertTenant(input: TenantUpsertInput, tenantId?: number) {
  const response = await authFetch(`${getApiBaseUrl()}/tenants${tenantId ? `/${tenantId}` : ""}`, {
    body: JSON.stringify(input),
    cache: "no-store",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    method: tenantId ? "PATCH" : "POST",
  });

  if (!response.ok) {
    throw new Error(`Tenant save request failed with status ${response.status}.`);
  }

  return toTenantRecord((await response.json()) as TenantApiRecord);
}

export async function softDeleteTenant(tenantId: number) {
  const response = await authFetch(`${getApiBaseUrl()}/tenants/${tenantId}`, {
    cache: "no-store",
    headers: {
      Accept: "application/json",
    },
    method: "DELETE",
  });

  if (!response.ok) {
    throw new Error(`Tenant delete request failed with status ${response.status}.`);
  }
}

function getApiBaseUrl() {
  return getRequiredApiUrl();
}

function toTenantRecord(record: TenantApiRecord): TenantRecord {
  return {
    id: Number(record.id),
    name: record.name,
    slug: record.slug,
    isActive: record.isActive,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    deletedAt: record.deletedAt,
  };
}
