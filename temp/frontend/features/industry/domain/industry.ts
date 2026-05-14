import type { MasterListColumnOption, MasterListFilterOption } from "@cxnext/ui";

export interface IndustryRecord {
  readonly id: number;
  readonly code: string;
  readonly name: string;
  readonly isActive: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly deletedAt: string | null;
}

export interface IndustryUpsertInput {
  readonly code: string;
  readonly name: string;
  readonly isActive: boolean;
}

export type IndustryStatusFilter = "all" | "active" | "inactive";
export type IndustryColumnId = "code" | "name" | "status" | "updated";

export const industryStatusFilters: readonly MasterListFilterOption[] = [
  { id: "all", label: "All industries" },
  { id: "active", label: "active" },
  { id: "inactive", label: "inactive" },
];

export const industryColumnCatalog = [
  { id: "code", label: "Code" },
  { id: "name", label: "Industry" },
  { id: "status", label: "Status" },
  { id: "updated", label: "Updated" },
] as const satisfies readonly {
  readonly id: IndustryColumnId;
  readonly label: string;
}[];

export const defaultIndustryColumnVisibility: Record<IndustryColumnId, boolean> = {
  code: true,
  name: true,
  status: true,
  updated: true,
};

export type IndustryColumnOption = MasterListColumnOption;
