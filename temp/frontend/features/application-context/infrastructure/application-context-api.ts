import { getRequiredApiUrl } from "@/lib/runtime-env";
import type {
  AccountingYearRecord,
  ApplicationContext,
  DefaultCompanyRecord,
  DefaultCompanyUpdateInput,
} from "../domain/application-context";
import { authFetch } from "../../auth/infrastructure/auth-api";
import { clearStoredAuthSession } from "../../auth/infrastructure/session-storage";
import type { CommonRecord } from "../../common/domain/common-master";

export class ApplicationContextRequestError extends Error {
  public constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "ApplicationContextRequestError";
  }
}

export async function getDefaultApplicationContext(
  options: { readonly signal?: AbortSignal } = {},
) {
  const response = await authFetch(`${getRequiredApiUrl()}/application/default-company`, {
    signal: options.signal,
  });

  if (!response.ok) {
    if (response.status === 401) {
      clearStoredAuthSession();
    }
    throw new ApplicationContextRequestError(
      `Application context failed with status ${response.status}.`,
      response.status,
    );
  }

  return (await response.json()) as ApplicationContext;
}

export async function listAccountingYears(options: { readonly signal?: AbortSignal } = {}) {
  const response = await authFetch(`${getRequiredApiUrl()}/common/accounting-years`, {
    signal: options.signal,
  });

  if (!response.ok) {
    throw new Error(`Accounting years failed with status ${response.status}.`);
  }

  const records = (await response.json()) as CommonRecord[];
  return records.map(toAccountingYearRecord);
}

export async function listDefaultCompanies(options: { readonly signal?: AbortSignal } = {}) {
  const response = await authFetch(`${getRequiredApiUrl()}/application/default-companies`, {
    signal: options.signal,
  });

  if (!response.ok) {
    throw new Error(`Default company failed with status ${response.status}.`);
  }

  return (await response.json()) as DefaultCompanyRecord[];
}

export async function updateDefaultCompany(input: DefaultCompanyUpdateInput) {
  const response = await authFetch(`${getRequiredApiUrl()}/application/default-company`, {
    body: JSON.stringify(input),
    headers: { "Content-Type": "application/json" },
    method: "PATCH",
  });

  if (!response.ok) {
    throw new Error(`Default company save failed with status ${response.status}.`);
  }

  return (await response.json()) as DefaultCompanyRecord;
}

function toAccountingYearRecord(record: CommonRecord): AccountingYearRecord {
  return {
    id: String(record.id),
    name: String(record.name ?? ""),
    startDate: String(record.startDate ?? ""),
    endDate: String(record.endDate ?? ""),
    booksStart: typeof record.booksStart === "string" ? record.booksStart : null,
    isActive: record.isActive,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    deletedAt: record.deletedAt,
  };
}
