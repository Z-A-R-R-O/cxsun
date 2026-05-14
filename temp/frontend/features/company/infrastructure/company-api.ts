import type { CompanyRecord, CompanyUpsertInput } from "../domain/company";
import { getRequiredApiUrl } from "@/lib/runtime-env";
import { authFetch } from "../../auth/infrastructure/auth-api";

type CompanyApiRecord = Omit<CompanyRecord, "id" | "tenantId" | "industryId"> & {
  readonly id: string;
  readonly tenantId: string;
  readonly industryId: string;
};

export async function listCompanies(options?: { readonly signal?: AbortSignal }) {
  const response = await authFetch(`${getApiBaseUrl()}/companies`, {
    cache: "no-store",
    headers: { Accept: "application/json" },
    signal: options?.signal,
  });

  if (!response.ok) {
    throw new Error(`Company list request failed with status ${response.status}.`);
  }

  return ((await response.json()) as CompanyApiRecord[]).map(toCompanyRecord);
}

export async function getCompany(companyId: number, options?: { readonly signal?: AbortSignal }) {
  const response = await authFetch(`${getApiBaseUrl()}/companies/${companyId}`, {
    cache: "no-store",
    headers: { Accept: "application/json" },
    signal: options?.signal,
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`Company detail request failed with status ${response.status}.`);
  }

  return toCompanyRecord((await response.json()) as CompanyApiRecord);
}

export async function upsertCompany(input: CompanyUpsertInput, companyId?: number) {
  const response = await authFetch(`${getApiBaseUrl()}/companies${companyId ? `/${companyId}` : ""}`, {
    body: JSON.stringify(input),
    cache: "no-store",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    method: companyId ? "PATCH" : "POST",
  });

  if (!response.ok) {
    throw new Error(`Company save request failed with status ${response.status}.`);
  }

  return toCompanyRecord((await response.json()) as CompanyApiRecord);
}

export async function softDeleteCompany(companyId: number) {
  const response = await authFetch(`${getApiBaseUrl()}/companies/${companyId}`, {
    cache: "no-store",
    headers: { Accept: "application/json" },
    method: "DELETE",
  });

  if (!response.ok) {
    throw new Error(`Company delete request failed with status ${response.status}.`);
  }
}

function getApiBaseUrl() {
  return getRequiredApiUrl();
}

function toCompanyRecord(record: CompanyApiRecord): CompanyRecord {
  return {
    ...record,
    id: Number(record.id),
    tenantId: Number(record.tenantId),
    industryId: Number(record.industryId),
    addresses: record.addresses ?? [],
    emails: record.emails ?? [],
    phones: record.phones ?? [],
    socialLinks: record.socialLinks ?? [],
    bankAccounts: record.bankAccounts ?? [],
    logos: record.logos ?? [],
  };
}
