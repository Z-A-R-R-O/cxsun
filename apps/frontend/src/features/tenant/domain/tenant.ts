import type { CommonListColumnOption, CommonListFilterOption } from "src/components/blocks/lists/common-list"

export type TenantStatus = "active" | "not_active" | "suspend"
export type TenantStatusFilter = "all" | TenantStatus
export type TenantColumnId = "name" | "code" | "updated" | "status"

export interface TenantRecord {
  id: number
  code: number
  name: string
  status: TenantStatus
  createdAt: string
  updatedAt: string
  deletedAt: string | null
}

export interface TenantUpsertInput {
  id?: number
  code?: number | null
  name: string
  status: TenantStatus
}

export interface TenantFormState {
  id?: number
  code: string
  name: string
  status: TenantStatus
}

export const tenantStatusFilters: readonly CommonListFilterOption[] = [
  { id: "all", label: "All tenants" },
  { id: "active", label: "active" },
  { id: "not_active", label: "not active" },
  { id: "suspend", label: "suspend" },
]

export const tenantColumnCatalog = [
  { id: "name", label: "Tenant" },
  { id: "code", label: "Code" },
  { id: "updated", label: "Updated" },
  { id: "status", label: "Status" },
] as const satisfies readonly {
  id: TenantColumnId
  label: string
}[]

export const defaultTenantColumnVisibility: Record<TenantColumnId, boolean> = {
  name: true,
  code: true,
  updated: true,
  status: true,
}

export const emptyTenantForm: TenantFormState = {
  code: "",
  name: "",
  status: "active",
}

export type TenantColumnOption = CommonListColumnOption
