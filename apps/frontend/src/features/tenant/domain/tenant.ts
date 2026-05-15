import type { CommonListColumnOption, CommonListFilterOption } from "src/components/blocks/lists/common-list"

export type TenantStatus = "active" | "not_active" | "suspend"
export type TenantStatusFilter = "all" | TenantStatus
export type TenantColumnId = "name" | "code" | "slug" | "database" | "companies" | "activeCompanies" | "concepts" | "updated" | "status"

export interface TenantRecord {
  id: number
  code: number
  slug: string
  name: string
  status: TenantStatus
  dbType: string
  dbHost: string
  dbPort: number
  dbName: string
  dbUser: string
  dbSecretRef: string
  companyCount: number
  activeCompanyCount: number
  companyConceptCount: number
  payloadSettings: string
  createdAt: string
  updatedAt: string
  deletedAt: string | null
}

export interface TenantUpsertInput {
  id?: number
  code?: number | null
  slug?: string | null
  name: string
  status: TenantStatus
  db_type?: string | null
  db_host?: string | null
  db_port?: number | null
  db_name?: string | null
  db_user?: string | null
  db_secret_ref?: string | null
  payload_settings?: string | null
}

export interface TenantFormState {
  id?: number
  code: string
  slug: string
  name: string
  status: TenantStatus
  dbType: string
  dbHost: string
  dbPort: string
  dbName: string
  dbUser: string
  dbSecretRef: string
  payloadSettings: string
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
  { id: "slug", label: "Slug" },
  { id: "database", label: "Database" },
  { id: "companies", label: "Companies" },
  { id: "activeCompanies", label: "Active" },
  { id: "concepts", label: "Concepts" },
  { id: "updated", label: "Updated" },
  { id: "status", label: "Status" },
] as const satisfies readonly {
  id: TenantColumnId
  label: string
}[]

export const defaultTenantColumnVisibility: Record<TenantColumnId, boolean> = {
  name: true,
  code: true,
  slug: true,
  database: true,
  companies: true,
  activeCompanies: true,
  concepts: true,
  updated: true,
  status: true,
}

export const emptyTenantForm: TenantFormState = {
  code: "",
  slug: "",
  name: "",
  status: "active",
  dbType: "mariadb",
  dbHost: "localhost",
  dbPort: "3306",
  dbName: "",
  dbUser: "root",
  dbSecretRef: "MARIADB_ROOT_PASSWORD",
  payloadSettings: "{}",
}

export type TenantColumnOption = CommonListColumnOption
