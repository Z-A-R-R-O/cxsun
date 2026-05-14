import type {
  IndustryColumnId,
  IndustryColumnOption,
  IndustryRecord,
  IndustryStatusFilter,
} from "../domain/industry";
import { industryColumnCatalog } from "../domain/industry";
export {
  getIndustry,
  listIndustries,
  softDeleteIndustry,
  upsertIndustry,
} from "../infrastructure/industry-api";

export function formatIndustryDate(value: string | null) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function buildIndustryColumnOptions(params: {
  readonly visibleColumns: Record<IndustryColumnId, boolean>;
  readonly onToggle: (columnId: IndustryColumnId, checked: boolean) => void;
}): readonly IndustryColumnOption[] {
  return industryColumnCatalog.map((column) => ({
    id: column.id,
    label: column.label,
    checked: params.visibleColumns[column.id],
    disabled:
      params.visibleColumns[column.id] &&
      industryColumnCatalog.filter((item) => params.visibleColumns[item.id]).length === 1,
    onCheckedChange: (checked) => params.onToggle(column.id, checked),
  }));
}

export function filterIndustries(params: {
  readonly industries: readonly IndustryRecord[];
  readonly searchValue: string;
  readonly statusFilter: IndustryStatusFilter;
}) {
  const normalizedSearch = params.searchValue.trim().toLowerCase();

  return params.industries.filter((industry) => {
    const matchesSearch =
      normalizedSearch.length === 0 ||
      [industry.code, industry.name, industry.isActive ? "active" : "inactive", industry.id]
        .join(" ")
        .toLowerCase()
        .includes(normalizedSearch);
    const matchesStatus =
      params.statusFilter === "all" ||
      (params.statusFilter === "active" && industry.isActive) ||
      (params.statusFilter === "inactive" && !industry.isActive);

    return matchesSearch && matchesStatus;
  });
}
