import type {
  TenantColumnId,
  TenantColumnOption,
  TenantRecord,
} from "../domain/tenant";
import { tenantColumnCatalog } from "../domain/tenant";
export { getTenant, listTenants, softDeleteTenant, upsertTenant } from "../infrastructure/tenant-api";

export function createTenantSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function formatTenantDate(value: string | null) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function buildTenantColumnOptions(params: {
  readonly visibleColumns: Record<TenantColumnId, boolean>;
  readonly onToggle: (columnId: TenantColumnId, checked: boolean) => void;
}): readonly TenantColumnOption[] {
  return tenantColumnCatalog.map((column) => ({
    id: column.id,
    label: column.label,
    checked: params.visibleColumns[column.id],
    disabled:
      params.visibleColumns[column.id] &&
      tenantColumnCatalog.filter((item) => params.visibleColumns[item.id]).length === 1,
    onCheckedChange: (checked) => params.onToggle(column.id, checked),
  }));
}

export function filterTenants(params: {
  readonly tenants: readonly TenantRecord[];
  readonly searchValue: string;
  readonly statusFilter: "all" | "active" | "inactive";
}) {
  const normalizedSearch = params.searchValue.trim().toLowerCase();

  return params.tenants.filter((tenant) => {
    const matchesSearch =
      normalizedSearch.length === 0 ||
      [tenant.name, tenant.slug, tenant.isActive ? "active" : "inactive", tenant.id]
        .join(" ")
        .toLowerCase()
        .includes(normalizedSearch);
    const matchesStatus =
      params.statusFilter === "all" ||
      (params.statusFilter === "active" && tenant.isActive) ||
      (params.statusFilter === "inactive" && !tenant.isActive);

    return matchesSearch && matchesStatus;
  });
}
