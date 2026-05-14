import type { MasterListColumnOption, MasterListFilterOption } from "@cxnext/ui";

export const TENANTS_TABLE_NAME = "tenants";

export interface TenantRecord {
  readonly id: number;
  readonly name: string;
  readonly slug: string;
  readonly isActive: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly deletedAt: string | null;
}

export interface TenantUpsertInput {
  readonly name: string;
  readonly slug: string;
  readonly isActive: boolean;
}

export type TenantStatusFilter = "all" | "active" | "inactive";
export type TenantColumnId = "name" | "slug" | "status" | "updated";

export const tenantStatusFilters: readonly MasterListFilterOption[] = [
  { id: "all", label: "All tenants" },
  { id: "active", label: "active" },
  { id: "inactive", label: "inactive" },
];

export const tenantColumnCatalog = [
  { id: "name", label: "Tenant" },
  { id: "slug", label: "Slug" },
  { id: "status", label: "Status" },
  { id: "updated", label: "Updated" },
] as const satisfies readonly {
  readonly id: TenantColumnId;
  readonly label: string;
}[];

export const defaultTenantColumnVisibility: Record<TenantColumnId, boolean> = {
  name: true,
  slug: true,
  status: true,
  updated: true,
};

export type TenantColumnOption = MasterListColumnOption;
