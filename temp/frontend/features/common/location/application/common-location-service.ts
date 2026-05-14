import type {
  CommonLocationColumnId,
  CommonLocationColumnOption,
  CommonLocationRecord,
  CommonLocationStatusFilter,
} from "../domain/common-location";
import { commonLocationColumnCatalog } from "../domain/common-location";
export {
  getCommonLocation,
  listCommonLocation,
  softDeleteCommonLocation,
  upsertCommonLocation,
} from "../infrastructure/common-location-api";

export function formatCommonLocationDate(value: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(
    new Date(value),
  );
}

export function createCommonLocationId(prefix: string, value: string) {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  return `${prefix}:${slug || "new"}`;
}

export function buildCommonLocationColumnOptions(params: {
  readonly visibleColumns: Record<CommonLocationColumnId, boolean>;
  readonly enabledColumns: readonly CommonLocationColumnId[];
  readonly onToggle: (columnId: CommonLocationColumnId, checked: boolean) => void;
}): readonly CommonLocationColumnOption[] {
  const catalog = commonLocationColumnCatalog.filter((column) =>
    params.enabledColumns.includes(column.id),
  );
  return catalog.map((column) => ({
    id: column.id,
    label: column.label,
    checked: params.visibleColumns[column.id],
    disabled:
      params.visibleColumns[column.id] &&
      catalog.filter((item) => params.visibleColumns[item.id]).length === 1,
    onCheckedChange: (checked) => params.onToggle(column.id, checked),
  }));
}

export function filterCommonLocation(params: {
  readonly records: readonly CommonLocationRecord[];
  readonly searchValue: string;
  readonly statusFilter: CommonLocationStatusFilter;
}) {
  const normalizedSearch = params.searchValue.trim().toLowerCase();
  return params.records.filter((record) => {
    const matchesSearch =
      normalizedSearch.length === 0 ||
      [
        record.id,
        record.code,
        record.name,
        record.areaName,
        record.countryName,
        record.stateName,
        record.districtName,
        record.cityName,
        record.isActive ? "active" : "inactive",
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(normalizedSearch);
    const matchesStatus =
      params.statusFilter === "all" ||
      (params.statusFilter === "active" && record.isActive) ||
      (params.statusFilter === "inactive" && !record.isActive);
    return matchesSearch && matchesStatus;
  });
}
