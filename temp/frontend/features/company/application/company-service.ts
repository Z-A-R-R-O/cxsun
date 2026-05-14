import type {
  CompanyColumnId,
  CompanyColumnOption,
  CompanyRecord,
  CompanyStatusFilter,
} from "../domain/company";
import { companyColumnCatalog } from "../domain/company";
import { readStoredApplicationContext } from "../../auth/infrastructure/session-storage";
import {
  getCompany as getCompanyRecord,
  listCompanies,
  softDeleteCompany,
  upsertCompany,
} from "../infrastructure/company-api";

export {
  getCompanyRecord as getCompany,
  listCompanies,
  softDeleteCompany,
  upsertCompany,
};

export async function getActiveCompany(options?: { readonly signal?: AbortSignal }) {
  const companyId = readStoredApplicationContext()?.company.id;
  if (!companyId) return null;
  return getCompanyRecord(Number(companyId), options);
}

export function formatCompanyDate(value: string | null) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function buildCompanyColumnOptions(params: {
  readonly visibleColumns: Record<CompanyColumnId, boolean>;
  readonly onToggle: (columnId: CompanyColumnId, checked: boolean) => void;
}): readonly CompanyColumnOption[] {
  return companyColumnCatalog.map((column) => ({
    id: column.id,
    label: column.label,
    checked: params.visibleColumns[column.id],
    disabled:
      params.visibleColumns[column.id] &&
      companyColumnCatalog.filter((item) => params.visibleColumns[item.id]).length === 1,
    onCheckedChange: (checked) => params.onToggle(column.id, checked),
  }));
}

export function filterCompanies(params: {
  readonly companies: readonly CompanyRecord[];
  readonly searchValue: string;
  readonly statusFilter: CompanyStatusFilter;
}) {
  const normalizedSearch = params.searchValue.trim().toLowerCase();

  return params.companies.filter((company) => {
    const matchesSearch =
      normalizedSearch.length === 0 ||
      [
        company.code,
        company.name,
        company.tenantName,
        company.industryCode,
        company.industryName,
        company.isActive ? "active" : "inactive",
        company.id,
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalizedSearch);
    const matchesStatus =
      params.statusFilter === "all" ||
      (params.statusFilter === "active" && company.isActive) ||
      (params.statusFilter === "inactive" && !company.isActive);

    return matchesSearch && matchesStatus;
  });
}
