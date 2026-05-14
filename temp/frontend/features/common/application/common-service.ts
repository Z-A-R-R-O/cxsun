import { listCommonRecords } from "../infrastructure/common-api";
import type {
  CommonColumnDefinition,
  CommonModuleDefinition,
  CommonRecord,
  CommonReferenceLookupMap,
} from "../domain/common-master";

export type {
  CommonColumnDefinition,
  CommonColumnType,
  CommonModuleDefinition,
  CommonRecord,
  CommonReferenceLookupMap,
} from "../domain/common-master";
type ReferenceModuleKey = "countries" | "states" | "districts" | "cities";
export {
  createCommonRecord,
  dropCommonRecord,
  forceDeleteCommonRecord,
  listCommonModules,
  listCommonRecords,
  updateCommonRecord,
} from "../infrastructure/common-api";

export const commonMenuGroups = [
  { label: "Location", items: ["countries", "states", "districts", "cities", "pincodes"] },
  { label: "Contacts", items: ["contactGroups", "contactTypes", "addressTypes", "bankNames"] },
  {
    label: "Product",
    items: [
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
  },
  {
    label: "Orders",
    items: ["warehouses", "transports", "destinations", "orderTypes", "stockRejectionTypes"],
  },
  { label: "Others", items: ["currencies", "paymentTerms", "months"] },
  { label: "Accounts", items: ["accountingYear"] },
] as const;

export const commonMenuLabels: Record<string, string> = {
  countries: "Countries",
  states: "States",
  districts: "Districts",
  cities: "Cities",
  pincodes: "Pincodes",
  contactGroups: "Contact Groups",
  contactTypes: "Contact Types",
  addressTypes: "Address Types",
  bankNames: "Bank Names",
  productGroups: "Product Groups",
  productCategories: "Product Categories",
  productTypes: "Product Types",
  units: "Units",
  hsnCodes: "HSN Codes",
  taxes: "Taxes",
  brands: "Brands",
  colours: "Colours",
  sizes: "Sizes",
  currencies: "Currencies",
  orderTypes: "Order Types",
  styles: "Styles",
  transports: "Transports",
  warehouses: "Warehouses",
  destinations: "Destinations",
  paymentTerms: "Payment Terms",
  months: "Months",
  stockRejectionTypes: "Stock Rejection Types",
  accountingYear: "Accounting Year",
  storefrontTemplates: "Storefront Templates",
  sliderThemes: "Slider Themes",
};

const codeNameDescription = [
  { key: "code", label: "Code", type: "string" as const, required: true, nullable: false },
  { key: "name", label: "Name", type: "string" as const, required: true, nullable: false },
  { key: "description", label: "Description", type: "string" as const, nullable: true },
] satisfies readonly CommonColumnDefinition[];

const accountingYearColumns = [
  {
    key: "name",
    label: "Accounting Year",
    type: "string" as const,
    required: true,
    nullable: false,
  },
  {
    key: "start_date",
    label: "Start Date",
    type: "string" as const,
    required: true,
    nullable: false,
  },
  { key: "end_date", label: "End Date", type: "string" as const, required: true, nullable: false },
  { key: "books_start", label: "Books Start", type: "string" as const, nullable: true },
] satisfies readonly CommonColumnDefinition[];

function simpleModule(key: string, tableName: string, idPrefix: string): CommonModuleDefinition {
  return {
    key,
    label: commonMenuLabels[key] ?? key,
    tableName,
    defaultSortKey: "name",
    idPrefix,
    columns: codeNameDescription,
  };
}

export const fallbackCommonModules: readonly CommonModuleDefinition[] = [
  {
    key: "countries",
    label: "Countries",
    tableName: "common_countries",
    defaultSortKey: "name",
    idPrefix: "country",
    columns: [
      { key: "code", label: "Code", type: "string", required: true, nullable: false },
      { key: "name", label: "Name", type: "string", required: true, nullable: false },
      { key: "phone_code", label: "Phone Code", type: "string", nullable: true },
    ],
  },
  {
    key: "states",
    label: "States",
    tableName: "common_states",
    defaultSortKey: "name",
    idPrefix: "state",
    columns: [
      { key: "country_id", label: "Country", type: "number", required: true, nullable: false },
      { key: "code", label: "Code", type: "string", required: true, nullable: false },
      { key: "name", label: "Name", type: "string", required: true, nullable: false },
    ],
  },
  {
    key: "districts",
    label: "Districts",
    tableName: "common_districts",
    defaultSortKey: "name",
    idPrefix: "district",
    columns: [
      { key: "state_id", label: "State", type: "number", required: true, nullable: false },
      { key: "code", label: "Code", type: "string", required: true, nullable: false },
      { key: "name", label: "Name", type: "string", required: true, nullable: false },
    ],
  },
  {
    key: "cities",
    label: "Cities",
    tableName: "common_cities",
    defaultSortKey: "name",
    idPrefix: "city",
    columns: [
      { key: "state_id", label: "State", type: "number", required: true, nullable: false },
      { key: "district_id", label: "District", type: "number", required: true, nullable: false },
      { key: "code", label: "Code", type: "string", required: true, nullable: false },
      { key: "name", label: "Name", type: "string", required: true, nullable: false },
    ],
  },
  {
    key: "pincodes",
    label: "Pincodes",
    tableName: "common_pincodes",
    defaultSortKey: "code",
    idPrefix: "pincode",
    columns: [
      { key: "country_id", label: "Country", type: "number", required: true, nullable: false },
      { key: "state_id", label: "State", type: "number", required: true, nullable: false },
      { key: "district_id", label: "District", type: "number", required: true, nullable: false },
      { key: "city_id", label: "City", type: "number", required: true, nullable: false },
      { key: "code", label: "Pincode", type: "string", required: true, nullable: false },
      { key: "area_name", label: "Area Name", type: "string", nullable: true },
    ],
  },
  simpleModule("contactGroups", "common_contact_groups", "contact-group"),
  simpleModule("contactTypes", "common_contact_types", "contact-type"),
  simpleModule("addressTypes", "common_address_types", "address-type"),
  simpleModule("bankNames", "common_bank_names", "bank-name"),
  simpleModule("productGroups", "common_product_groups", "product-group"),
  {
    key: "productCategories",
    label: "Product Categories",
    tableName: "common_product_categories",
    defaultSortKey: "position_order",
    idPrefix: "product-category",
    columns: [
      ...codeNameDescription,
      { key: "image", label: "Image", type: "string", nullable: true },
      { key: "position_order", label: "Position Order", type: "number" },
      { key: "show_on_storefront_top_menu", label: "Show On Storefront Top Menu", type: "boolean" },
      { key: "show_on_storefront_catalog", label: "Show On Storefront Catalog", type: "boolean" },
    ],
  },
  simpleModule("productTypes", "common_product_types", "product-type"),
  {
    key: "units",
    label: "Units",
    tableName: "common_units",
    defaultSortKey: "name",
    idPrefix: "unit",
    columns: [
      { key: "code", label: "Code", type: "string", required: true, nullable: false },
      { key: "name", label: "Name", type: "string", required: true, nullable: false },
      { key: "symbol", label: "Symbol", type: "string", nullable: true },
      { key: "description", label: "Description", type: "string", nullable: true },
    ],
  },
  {
    key: "hsnCodes",
    label: "HSN Codes",
    tableName: "common_hsn_codes",
    defaultSortKey: "code",
    idPrefix: "hsn",
    columns: [
      { key: "code", label: "Code", type: "string", required: true, nullable: false },
      { key: "name", label: "Name", type: "string", required: true, nullable: false },
      { key: "description", label: "Description", type: "string", required: true, nullable: false },
    ],
  },
  {
    key: "taxes",
    label: "Taxes",
    tableName: "common_taxes",
    defaultSortKey: "name",
    idPrefix: "tax",
    columns: [
      { key: "code", label: "Code", type: "string", required: true, nullable: false },
      { key: "name", label: "Name", type: "string", required: true, nullable: false },
      { key: "tax_type", label: "Tax Type", type: "string", required: true, nullable: false },
      {
        key: "rate_percent",
        label: "Rate Percent",
        type: "number",
        required: true,
        nullable: false,
      },
      { key: "description", label: "Description", type: "string", nullable: true },
    ],
  },
  simpleModule("brands", "common_brands", "brand"),
  {
    key: "colours",
    label: "Colours",
    tableName: "common_colours",
    defaultSortKey: "name",
    idPrefix: "colour",
    columns: [
      ...codeNameDescription,
      { key: "hex_code", label: "Hex Code", type: "string", nullable: true },
    ],
  },
  {
    key: "sizes",
    label: "Sizes",
    tableName: "common_sizes",
    defaultSortKey: "sort_order",
    idPrefix: "size",
    columns: [...codeNameDescription, { key: "sort_order", label: "Sort Order", type: "number" }],
  },
  {
    key: "currencies",
    label: "Currencies",
    tableName: "common_currencies",
    defaultSortKey: "code",
    idPrefix: "currency",
    columns: [
      { key: "code", label: "Code", type: "string", required: true, nullable: false },
      { key: "name", label: "Name", type: "string", required: true, nullable: false },
      { key: "symbol", label: "Symbol", type: "string", required: true, nullable: false },
      { key: "decimal_places", label: "Decimal Places", type: "number" },
    ],
  },
  simpleModule("orderTypes", "common_order_types", "order-type"),
  simpleModule("styles", "common_styles", "style"),
  simpleModule("transports", "common_transports", "transport"),
  simpleModule("destinations", "common_destinations", "destination"),
  {
    key: "paymentTerms",
    label: "Payment Terms",
    tableName: "common_payment_terms",
    defaultSortKey: "name",
    idPrefix: "payment-term",
    columns: [...codeNameDescription, { key: "due_days", label: "Due Days", type: "number" }],
  },
  {
    key: "accountingYear",
    label: "Accounting Year",
    tableName: "accounting_years",
    defaultSortKey: "start_date",
    idPrefix: "accounting-year",
    columns: accountingYearColumns,
  },
  {
    key: "months",
    label: "Months",
    tableName: "common_months",
    defaultSortKey: "start_date",
    idPrefix: "month",
    columns: [
      { key: "code", label: "Code", type: "string", required: true, nullable: false },
      { key: "name", label: "Name", type: "string", required: true, nullable: false },
      { key: "start_date", label: "Start Date", type: "string", required: true, nullable: false },
      { key: "end_date", label: "End Date", type: "string", required: true, nullable: false },
      { key: "description", label: "Description", type: "string", nullable: true },
    ],
  },
  simpleModule("stockRejectionTypes", "common_stock_rejection_types", "stock-rejection-type"),
  {
    key: "warehouses",
    label: "Warehouses",
    tableName: "common_warehouses",
    defaultSortKey: "name",
    idPrefix: "warehouse",
    columns: [
      { key: "code", label: "Code", type: "string", required: true, nullable: false },
      { key: "name", label: "Name", type: "string", required: true, nullable: false },
      { key: "is_default_location", label: "Default Location", type: "boolean" },
      { key: "country", label: "Country", type: "string", nullable: true },
      { key: "state", label: "State", type: "string", nullable: true },
      { key: "district", label: "District", type: "string", nullable: true },
      { key: "city", label: "City", type: "string", nullable: true },
      { key: "pincode", label: "Pincode", type: "string", nullable: true },
      { key: "address_line1", label: "Address Line 1", type: "string", nullable: true },
      { key: "address_line2", label: "Address Line 2", type: "string", nullable: true },
      { key: "description", label: "Description", type: "string", nullable: true },
    ],
  },
  {
    key: "storefrontTemplates",
    label: "Storefront Templates",
    tableName: "common_storefront_templates",
    defaultSortKey: "sort_order",
    idPrefix: "storefront-template",
    columns: [
      { key: "code", label: "Code", type: "string", required: true, nullable: false },
      { key: "name", label: "Name", type: "string", required: true, nullable: false },
      { key: "sort_order", label: "Sort Order", type: "number" },
      { key: "badge_text", label: "Badge", type: "string", nullable: true },
      { key: "title", label: "Title", type: "string", required: true, nullable: false },
      { key: "description", label: "Description", type: "string", nullable: true },
    ],
  },
  {
    key: "sliderThemes",
    label: "Slider Themes",
    tableName: "common_slider_themes",
    defaultSortKey: "sort_order",
    idPrefix: "slider-theme",
    columns: [
      { key: "code", label: "Code", type: "string", required: true, nullable: false },
      { key: "name", label: "Name", type: "string", required: true, nullable: false },
      { key: "sort_order", label: "Sort Order", type: "number" },
      {
        key: "background_from",
        label: "Background From",
        type: "string",
        required: true,
        nullable: false,
      },
      {
        key: "background_via",
        label: "Background Via",
        type: "string",
        required: true,
        nullable: false,
      },
      {
        key: "background_to",
        label: "Background To",
        type: "string",
        required: true,
        nullable: false,
      },
    ],
  },
];

export async function listCommonReferenceLookups(
  definition: CommonModuleDefinition,
  options?: { readonly signal?: AbortSignal },
): Promise<CommonReferenceLookupMap> {
  const lookupEntries = await Promise.all(
    definition.columns
      .map((column) => [column.key, getReferenceModuleKey(column.key)] as const)
      .filter((entry): entry is readonly [string, ReferenceModuleKey] => Boolean(entry[1]))
      .map(async ([columnKey, moduleKey]) => {
        const records = await listCommonRecords(moduleKey, options);
        return [columnKey, toDisplayLookup(records)] as const;
      }),
  );

  return Object.fromEntries(lookupEntries);
}

export function formatCommonDate(value: unknown) {
  if (!value || typeof value !== "string") return "-";
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(
    new Date(value),
  );
}

function getReferenceModuleKey(columnKey: string): ReferenceModuleKey | null {
  if (columnKey === "country_id") return "countries";
  if (columnKey === "state_id") return "states";
  if (columnKey === "district_id") return "districts";
  if (columnKey === "city_id") return "cities";
  return null;
}

function toDisplayLookup(records: readonly CommonRecord[]) {
  return new Map(
    records.map((record) => [
      String(record.id),
      String(record.name ?? record.areaName ?? record.code ?? record.id),
    ]),
  );
}
