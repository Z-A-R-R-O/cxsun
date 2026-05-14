import { commonModuleDefinitions, type CommonModuleDefinition } from "../../common-modules";

export const commonMasterGroups = {
  location: ["countries", "states", "districts", "cities", "pincodes"],
  contacts: ["contactGroups", "contactTypes", "addressTypes", "bankNames"],
  product: [
    "productGroups",
    "productCategories",
    "productTypes",
    "brands",
    "colours",
    "sizes",
    "styles",
    "units",
    "hsnCodes",
    "taxes",
  ],
  orders: ["warehouses", "transports", "destinations", "orderTypes", "stockRejectionTypes"],
  others: ["currencies", "paymentTerms", "months"],
} as const;

export function getCommonMasterDefinitions(
  keys: readonly string[],
): readonly CommonModuleDefinition[] {
  return keys.map((key) => {
    const definition = commonModuleDefinitions.find((item) => item.key === key);
    if (!definition) throw new Error(`Missing common module definition for ${key}.`);
    return definition;
  });
}
