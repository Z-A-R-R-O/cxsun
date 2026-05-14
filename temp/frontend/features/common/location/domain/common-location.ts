import type { MasterListColumnOption, MasterListFilterOption } from "@cxnext/ui";

export type CommonLocationModuleKey = "countries" | "states" | "districts" | "cities" | "pincodes";

export interface CommonLocationRecord {
  readonly id: string;
  readonly countryId: string | null;
  readonly countryName: string | null;
  readonly stateId: string | null;
  readonly stateName: string | null;
  readonly districtId: string | null;
  readonly districtName: string | null;
  readonly cityId: string | null;
  readonly cityName: string | null;
  readonly code: string;
  readonly name: string | null;
  readonly phoneCode: string | null;
  readonly areaName: string | null;
  readonly isActive: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly deletedAt: string | null;
}

export type CommonLocationUpsertInput = Omit<
  CommonLocationRecord,
  | "countryName"
  | "stateName"
  | "districtName"
  | "cityName"
  | "createdAt"
  | "updatedAt"
  | "deletedAt"
>;
export type CommonLocationStatusFilter = "all" | "active" | "inactive";
export type CommonLocationColumnId = "code" | "name" | "references" | "status" | "updated";

export interface CommonLocationModuleDefinition {
  readonly key: CommonLocationModuleKey;
  readonly title: string;
  readonly singularTitle: string;
  readonly description: string;
  readonly endpoint: string;
  readonly idPrefix: string;
  readonly primaryLabel: string;
  readonly columns: readonly CommonLocationColumnId[];
  readonly fields: readonly (keyof CommonLocationUpsertInput)[];
}

export const commonLocationDefinitions: Record<
  CommonLocationModuleKey,
  CommonLocationModuleDefinition
> = {
  countries: {
    key: "countries",
    title: "Countries",
    singularTitle: "Country",
    description: "Country master and dialing defaults.",
    endpoint: "common/countries",
    idPrefix: "country",
    primaryLabel: "Country name",
    columns: ["code", "name", "status", "updated"],
    fields: ["id", "code", "name", "phoneCode", "isActive"],
  },
  states: {
    key: "states",
    title: "States",
    singularTitle: "State",
    description: "State and province definitions.",
    endpoint: "common/states",
    idPrefix: "state",
    primaryLabel: "State name",
    columns: ["code", "name", "references", "status", "updated"],
    fields: ["id", "countryId", "code", "name", "isActive"],
  },
  districts: {
    key: "districts",
    title: "Districts",
    singularTitle: "District",
    description: "District classification under states.",
    endpoint: "common/districts",
    idPrefix: "district",
    primaryLabel: "District name",
    columns: ["code", "name", "references", "status", "updated"],
    fields: ["id", "stateId", "code", "name", "isActive"],
  },
  cities: {
    key: "cities",
    title: "Cities",
    singularTitle: "City",
    description: "City-level operating locations.",
    endpoint: "common/cities",
    idPrefix: "city",
    primaryLabel: "City name",
    columns: ["code", "name", "references", "status", "updated"],
    fields: ["id", "stateId", "districtId", "code", "name", "isActive"],
  },
  pincodes: {
    key: "pincodes",
    title: "Pincodes",
    singularTitle: "Pincode",
    description: "Postal code and delivery areas.",
    endpoint: "common/pincodes",
    idPrefix: "pincode",
    primaryLabel: "Area name",
    columns: ["code", "name", "references", "status", "updated"],
    fields: ["id", "countryId", "stateId", "districtId", "cityId", "code", "areaName", "isActive"],
  },
};

export const commonLocationStatusFilters: readonly MasterListFilterOption[] = [
  { id: "all", label: "All records" },
  { id: "active", label: "active" },
  { id: "inactive", label: "inactive" },
];

export const commonLocationColumnCatalog = [
  { id: "code", label: "Code" },
  { id: "name", label: "Name" },
  { id: "references", label: "References" },
  { id: "status", label: "Status" },
  { id: "updated", label: "Updated" },
] as const satisfies readonly { readonly id: CommonLocationColumnId; readonly label: string }[];

export const defaultCommonLocationColumnVisibility: Record<CommonLocationColumnId, boolean> = {
  code: true,
  name: true,
  references: true,
  status: true,
  updated: true,
};

export type CommonLocationColumnOption = MasterListColumnOption;
