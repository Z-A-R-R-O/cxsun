import type { IndustryRecord, IndustryUpsertInput } from "../domain/industry";
import { getRequiredApiUrl } from "@/lib/runtime-env";
import { authFetch } from "../../auth/infrastructure/auth-api";

interface IndustryApiRecord {
  readonly id: string;
  readonly code: string;
  readonly name: string;
  readonly isActive: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly deletedAt: string | null;
}

export async function listIndustries(options?: { readonly signal?: AbortSignal }) {
  const response = await authFetch(`${getApiBaseUrl()}/industries`, {
    cache: "no-store",
    headers: {
      Accept: "application/json",
    },
    signal: options?.signal,
  });

  if (!response.ok) {
    throw new Error(`Industry list request failed with status ${response.status}.`);
  }

  const records = (await response.json()) as IndustryApiRecord[];
  return records.map(toIndustryRecord);
}

export async function getIndustry(industryId: number, options?: { readonly signal?: AbortSignal }) {
  const response = await authFetch(`${getApiBaseUrl()}/industries/${industryId}`, {
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
    throw new Error(`Industry detail request failed with status ${response.status}.`);
  }

  return toIndustryRecord((await response.json()) as IndustryApiRecord);
}

export async function upsertIndustry(input: IndustryUpsertInput, industryId?: number) {
  const response = await authFetch(
    `${getApiBaseUrl()}/industries${industryId ? `/${industryId}` : ""}`,
    {
      body: JSON.stringify(input),
      cache: "no-store",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      method: industryId ? "PATCH" : "POST",
    },
  );

  if (!response.ok) {
    throw new Error(`Industry save request failed with status ${response.status}.`);
  }

  return toIndustryRecord((await response.json()) as IndustryApiRecord);
}

export async function softDeleteIndustry(industryId: number) {
  const response = await authFetch(`${getApiBaseUrl()}/industries/${industryId}`, {
    cache: "no-store",
    headers: {
      Accept: "application/json",
    },
    method: "DELETE",
  });

  if (!response.ok) {
    throw new Error(`Industry delete request failed with status ${response.status}.`);
  }
}

function getApiBaseUrl() {
  return getRequiredApiUrl();
}

function toIndustryRecord(record: IndustryApiRecord): IndustryRecord {
  return {
    id: Number(record.id),
    code: record.code,
    name: record.name,
    isActive: record.isActive,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    deletedAt: record.deletedAt,
  };
}
