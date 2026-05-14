export type CommonMasterModuleKey =
  | "contactGroups"
  | "contactTypes"
  | "addressTypes"
  | "bankNames"
  | "productGroups"
  | "productCategories"
  | "productTypes"
  | "brands"
  | "colours"
  | "sizes"
  | "styles"
  | "units"
  | "hsnCodes"
  | "taxes"
  | "warehouses"
  | "transports"
  | "destinations"
  | "orderTypes"
  | "stockRejectionTypes"
  | "currencies"
  | "paymentTerms"
  | "months"
  | "accountingYear";

export type CommonMasterColumnKey =
  | "code"
  | "name"
  | "description"
  | "image"
  | "positionOrder"
  | "sortOrder"
  | "hexCode"
  | "symbol"
  | "taxType"
  | "ratePercent"
  | "isDefaultLocation"
  | "country"
  | "state"
  | "district"
  | "city"
  | "pincode"
  | "addressLine1"
  | "addressLine2"
  | "decimalPlaces"
  | "dueDays"
  | "startDate"
  | "endDate"
  | "booksStart"
  | "showOnStorefrontTopMenu"
  | "showOnStorefrontCatalog"
  | "isActive";

export interface CommonMasterDefinition {
  readonly key: CommonMasterModuleKey;
  readonly tableName: string;
  readonly label: string;
  readonly listOrder: readonly [string, "asc" | "desc"];
  readonly writableColumns: readonly CommonMasterColumnKey[];
}

export const commonMasterDefinitions = {
  contactGroups: {
    key: "contactGroups",
    tableName: "common_contact_groups",
    label: "Contact Groups",
    listOrder: ["name", "asc"],
    writableColumns: ["code", "name", "description", "isActive"],
  },
  contactTypes: {
    key: "contactTypes",
    tableName: "common_contact_types",
    label: "Contact Types",
    listOrder: ["name", "asc"],
    writableColumns: ["code", "name", "description", "isActive"],
  },
  addressTypes: {
    key: "addressTypes",
    tableName: "common_address_types",
    label: "Address Types",
    listOrder: ["name", "asc"],
    writableColumns: ["code", "name", "description", "isActive"],
  },
  bankNames: {
    key: "bankNames",
    tableName: "common_bank_names",
    label: "Bank Names",
    listOrder: ["name", "asc"],
    writableColumns: ["code", "name", "description", "isActive"],
  },
  productGroups: {
    key: "productGroups",
    tableName: "common_product_groups",
    label: "Product Groups",
    listOrder: ["name", "asc"],
    writableColumns: ["code", "name", "description", "isActive"],
  },
  productCategories: {
    key: "productCategories",
    tableName: "common_product_categories",
    label: "Product Categories",
    listOrder: ["position_order", "asc"],
    writableColumns: [
      "code",
      "name",
      "description",
      "image",
      "positionOrder",
      "showOnStorefrontTopMenu",
      "showOnStorefrontCatalog",
      "isActive",
    ],
  },
  productTypes: {
    key: "productTypes",
    tableName: "common_product_types",
    label: "Product Types",
    listOrder: ["name", "asc"],
    writableColumns: ["code", "name", "description", "isActive"],
  },
  brands: {
    key: "brands",
    tableName: "common_brands",
    label: "Brands",
    listOrder: ["name", "asc"],
    writableColumns: ["code", "name", "description", "isActive"],
  },
  colours: {
    key: "colours",
    tableName: "common_colours",
    label: "Colours",
    listOrder: ["name", "asc"],
    writableColumns: ["code", "name", "description", "hexCode", "isActive"],
  },
  sizes: {
    key: "sizes",
    tableName: "common_sizes",
    label: "Sizes",
    listOrder: ["sort_order", "asc"],
    writableColumns: ["code", "name", "description", "sortOrder", "isActive"],
  },
  styles: {
    key: "styles",
    tableName: "common_styles",
    label: "Styles",
    listOrder: ["name", "asc"],
    writableColumns: ["code", "name", "description", "isActive"],
  },
  units: {
    key: "units",
    tableName: "common_units",
    label: "Units",
    listOrder: ["name", "asc"],
    writableColumns: ["code", "name", "symbol", "description", "isActive"],
  },
  hsnCodes: {
    key: "hsnCodes",
    tableName: "common_hsn_codes",
    label: "HSN Codes",
    listOrder: ["code", "asc"],
    writableColumns: ["code", "name", "description", "isActive"],
  },
  taxes: {
    key: "taxes",
    tableName: "common_taxes",
    label: "Taxes",
    listOrder: ["rate_percent", "asc"],
    writableColumns: ["code", "name", "taxType", "ratePercent", "description", "isActive"],
  },
  warehouses: {
    key: "warehouses",
    tableName: "common_warehouses",
    label: "Warehouses",
    listOrder: ["name", "asc"],
    writableColumns: [
      "code",
      "name",
      "isDefaultLocation",
      "country",
      "state",
      "district",
      "city",
      "pincode",
      "addressLine1",
      "addressLine2",
      "description",
      "isActive",
    ],
  },
  transports: {
    key: "transports",
    tableName: "common_transports",
    label: "Transports",
    listOrder: ["name", "asc"],
    writableColumns: ["code", "name", "description", "isActive"],
  },
  destinations: {
    key: "destinations",
    tableName: "common_destinations",
    label: "Destinations",
    listOrder: ["name", "asc"],
    writableColumns: ["code", "name", "description", "isActive"],
  },
  orderTypes: {
    key: "orderTypes",
    tableName: "common_order_types",
    label: "Order Types",
    listOrder: ["name", "asc"],
    writableColumns: ["code", "name", "description", "isActive"],
  },
  stockRejectionTypes: {
    key: "stockRejectionTypes",
    tableName: "common_stock_rejection_types",
    label: "Stock Rejection Types",
    listOrder: ["name", "asc"],
    writableColumns: ["code", "name", "description", "isActive"],
  },
  currencies: {
    key: "currencies",
    tableName: "common_currencies",
    label: "Currencies",
    listOrder: ["code", "asc"],
    writableColumns: ["code", "name", "symbol", "decimalPlaces", "isActive"],
  },
  paymentTerms: {
    key: "paymentTerms",
    tableName: "common_payment_terms",
    label: "Payment Terms",
    listOrder: ["name", "asc"],
    writableColumns: ["code", "name", "description", "dueDays", "isActive"],
  },
  months: {
    key: "months",
    tableName: "common_months",
    label: "Months",
    listOrder: ["start_date", "asc"],
    writableColumns: ["code", "name", "startDate", "endDate", "description", "isActive"],
  },
  accountingYear: {
    key: "accountingYear",
    tableName: "accounting_years",
    label: "Accounting Year",
    listOrder: ["start_date", "desc"],
    writableColumns: ["name", "startDate", "endDate", "booksStart", "isActive"],
  },
} as const satisfies Record<CommonMasterModuleKey, CommonMasterDefinition>;

export function getCommonMasterDefinition(key: CommonMasterModuleKey) {
  return commonMasterDefinitions[key];
}
