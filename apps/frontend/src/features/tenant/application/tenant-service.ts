import type {
  TenantColumnId,
  TenantColumnOption,
  TenantFormState,
  TenantRecord,
  TenantStatusFilter,
  TenantUpsertInput,
} from "../domain/tenant"
import { tenantColumnCatalog } from "../domain/tenant"
export { listTenants, upsertTenant } from "../infrastructure/tenant-api"
export { restoreTenant, softDeleteTenant } from "../infrastructure/tenant-api"

export function toTenantForm(tenant: TenantRecord): TenantFormState {
  return {
    id: tenant.id,
    code: String(tenant.code),
    slug: tenant.slug,
    name: tenant.name,
    status: tenant.status,
    dbType: tenant.dbType,
    dbHost: tenant.dbHost,
    dbPort: String(tenant.dbPort),
    dbName: tenant.dbName,
    dbUser: tenant.dbUser,
    dbSecretRef: tenant.dbSecretRef,
    payloadSettings: tenant.payloadSettings || "{}",
  }
}

export function toTenantUpsertInput(form: TenantFormState): TenantUpsertInput {
  return {
    id: form.id,
    code: form.code ? Number(form.code) : null,
    slug: form.slug.trim() || null,
    name: form.name.trim(),
    status: form.status,
    db_type: form.dbType || "mariadb",
    db_host: form.dbHost.trim(),
    db_port: form.dbPort ? Number(form.dbPort) : null,
    db_name: form.dbName.trim(),
    db_user: form.dbUser.trim(),
    db_secret_ref: form.dbSecretRef.trim(),
    payload_settings: form.payloadSettings.trim() || "{}",
  }
}

export function formatTenantDate(value: string | null) {
  if (!value) {
    return "-"
  }

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value))
}

export function buildTenantColumnOptions(params: {
  visibleColumns: Record<TenantColumnId, boolean>
  onToggle: (columnId: TenantColumnId, checked: boolean) => void
}): readonly TenantColumnOption[] {
  const visibleCount = tenantColumnCatalog.filter((item) => params.visibleColumns[item.id]).length

  return tenantColumnCatalog.map((column) => ({
    id: column.id,
    label: column.label,
    checked: params.visibleColumns[column.id],
    disabled: params.visibleColumns[column.id] && visibleCount === 1,
    onCheckedChange: (checked) => params.onToggle(column.id, checked),
  }))
}

export function filterTenants(params: {
  tenants: readonly TenantRecord[]
  searchValue: string
  statusFilter: TenantStatusFilter
}) {
  const normalizedSearch = params.searchValue.trim().toLowerCase()

  return params.tenants.filter((tenant) => {
    const matchesSearch =
      normalizedSearch.length === 0 ||
      [
        tenant.name,
        tenant.code,
        tenant.slug,
        tenant.dbHost,
        tenant.dbName,
        tenant.dbUser,
        tenant.companyCount,
        tenant.activeCompanyCount,
        tenant.companyConceptCount,
        tenant.status,
        tenant.id,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(normalizedSearch)
    const matchesStatus = params.statusFilter === "all" || tenant.status === params.statusFilter

    return matchesSearch && matchesStatus
  })
}

export function compareTenantRecords(
  left: TenantRecord,
  right: TenantRecord,
  key: TenantColumnId,
  direction: "asc" | "desc",
) {
  const multiplier = direction === "asc" ? 1 : -1

  if (key === "updated") {
    return (new Date(left.updatedAt).getTime() - new Date(right.updatedAt).getTime()) * multiplier
  }

  const leftValue = getComparableValue(left, key)
  const rightValue = getComparableValue(right, key)

  return leftValue.localeCompare(rightValue) * multiplier
}

function getComparableValue(tenant: TenantRecord, key: TenantColumnId) {
  switch (key) {
    case "code":
      return String(tenant.code).padStart(8, "0")
    case "database":
      return tenant.dbName
    case "companies":
      return String(tenant.companyCount).padStart(8, "0")
    case "activeCompanies":
      return String(tenant.activeCompanyCount).padStart(8, "0")
    case "concepts":
      return String(tenant.companyConceptCount).padStart(8, "0")
    case "updated":
      return tenant.updatedAt
    default:
      return String(tenant[key])
  }
}
