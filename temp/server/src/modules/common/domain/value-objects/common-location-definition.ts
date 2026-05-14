export type CommonLocationModuleKey = "countries" | "states" | "districts" | "cities" | "pincodes";

export type CommonLocationColumnKey =
  | "countryId"
  | "stateId"
  | "districtId"
  | "cityId"
  | "code"
  | "name"
  | "phoneCode"
  | "areaName"
  | "isActive"
  | "createdAt"
  | "updatedAt"
  | "deletedAt";

export interface CommonLocationDefinition {
  readonly key: CommonLocationModuleKey;
  readonly tableName: string;
  readonly label: string;
  readonly listOrder: readonly string[];
  readonly writableColumns: readonly CommonLocationColumnKey[];
}

export const commonLocationDefinitions = {
  countries: {
    key: "countries",
    tableName: "common_countries",
    label: "Countries",
    listOrder: ["id", "asc"],
    writableColumns: ["code", "name", "phoneCode", "isActive"],
  },
  states: {
    key: "states",
    tableName: "common_states",
    label: "States",
    listOrder: ["name", "asc"],
    writableColumns: ["countryId", "code", "name", "isActive"],
  },
  districts: {
    key: "districts",
    tableName: "common_districts",
    label: "Districts",
    listOrder: ["name", "asc"],
    writableColumns: ["stateId", "code", "name", "isActive"],
  },
  cities: {
    key: "cities",
    tableName: "common_cities",
    label: "Cities",
    listOrder: ["name", "asc"],
    writableColumns: ["stateId", "districtId", "code", "name", "isActive"],
  },
  pincodes: {
    key: "pincodes",
    tableName: "common_pincodes",
    label: "Pincodes",
    listOrder: ["code", "asc"],
    writableColumns: [
      "countryId",
      "stateId",
      "districtId",
      "cityId",
      "code",
      "areaName",
      "isActive",
    ],
  },
} as const satisfies Record<CommonLocationModuleKey, CommonLocationDefinition>;

export function getCommonLocationDefinition(key: CommonLocationModuleKey) {
  return commonLocationDefinitions[key];
}
