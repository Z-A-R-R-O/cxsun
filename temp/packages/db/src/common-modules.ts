export type CommonColumnType = "string" | "number" | "boolean";

export interface CommonModuleColumn {
  readonly key: string;
  readonly label: string;
  readonly type: CommonColumnType;
  readonly required?: boolean;
  readonly nullable?: boolean;
  readonly numberMode?: "integer" | "decimal";
}

export interface CommonModuleDefinition {
  readonly key: string;
  readonly label: string;
  readonly tableName: string;
  readonly defaultSortKey: string;
  readonly idPrefix: string;
  readonly columns: readonly CommonModuleColumn[];
}

const codeNameDescription = [
  { key: "code", label: "Code", type: "string", required: true, nullable: false },
  { key: "name", label: "Name", type: "string", required: true, nullable: false },
  { key: "description", label: "Description", type: "string", nullable: true },
] as const satisfies readonly CommonModuleColumn[];

function defineSimple(
  key: string,
  label: string,
  tableName: string,
  idPrefix: string,
): CommonModuleDefinition {
  return { key, label, tableName, idPrefix, defaultSortKey: "name", columns: codeNameDescription };
}

export const commonModuleDefinitions = [
  {
    key: "countries",
    label: "Countries",
    tableName: "common_countries",
    idPrefix: "country",
    defaultSortKey: "name",
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
    idPrefix: "state",
    defaultSortKey: "name",
    columns: [
      {
        key: "country_id",
        label: "Country",
        type: "number",
        numberMode: "integer",
        required: true,
        nullable: false,
      },
      { key: "code", label: "Code", type: "string", required: true, nullable: false },
      { key: "name", label: "Name", type: "string", required: true, nullable: false },
    ],
  },
  {
    key: "districts",
    label: "Districts",
    tableName: "common_districts",
    idPrefix: "district",
    defaultSortKey: "name",
    columns: [
      {
        key: "state_id",
        label: "State",
        type: "number",
        numberMode: "integer",
        required: true,
        nullable: false,
      },
      { key: "code", label: "Code", type: "string", required: true, nullable: false },
      { key: "name", label: "Name", type: "string", required: true, nullable: false },
    ],
  },
  {
    key: "cities",
    label: "Cities",
    tableName: "common_cities",
    idPrefix: "city",
    defaultSortKey: "name",
    columns: [
      {
        key: "state_id",
        label: "State",
        type: "number",
        numberMode: "integer",
        required: true,
        nullable: false,
      },
      {
        key: "district_id",
        label: "District",
        type: "number",
        numberMode: "integer",
        required: true,
        nullable: false,
      },
      { key: "code", label: "Code", type: "string", required: true, nullable: false },
      { key: "name", label: "Name", type: "string", required: true, nullable: false },
    ],
  },
  {
    key: "pincodes",
    label: "Pincodes",
    tableName: "common_pincodes",
    idPrefix: "pincode",
    defaultSortKey: "code",
    columns: [
      {
        key: "country_id",
        label: "Country",
        type: "number",
        numberMode: "integer",
        required: true,
        nullable: false,
      },
      {
        key: "state_id",
        label: "State",
        type: "number",
        numberMode: "integer",
        required: true,
        nullable: false,
      },
      {
        key: "district_id",
        label: "District",
        type: "number",
        numberMode: "integer",
        required: true,
        nullable: false,
      },
      {
        key: "city_id",
        label: "City",
        type: "number",
        numberMode: "integer",
        required: true,
        nullable: false,
      },
      { key: "code", label: "Pincode", type: "string", required: true, nullable: false },
      { key: "area_name", label: "Area Name", type: "string", nullable: true },
    ],
  },
  defineSimple("contactGroups", "Contact Groups", "common_contact_groups", "contact-group"),
  defineSimple("contactTypes", "Contact Types", "common_contact_types", "contact-type"),
  defineSimple("addressTypes", "Address Types", "common_address_types", "address-type"),
  defineSimple("bankNames", "Bank Names", "common_bank_names", "bank-name"),
  defineSimple("productGroups", "Product Groups", "common_product_groups", "product-group"),
  {
    key: "productCategories",
    label: "Product Categories",
    tableName: "common_product_categories",
    idPrefix: "product-category",
    defaultSortKey: "position_order",
    columns: [
      ...codeNameDescription,
      { key: "image", label: "Image", type: "string", nullable: true },
      { key: "position_order", label: "Position Order", type: "number", numberMode: "integer" },
      { key: "show_on_storefront_top_menu", label: "Show On Storefront Top Menu", type: "boolean" },
      { key: "show_on_storefront_catalog", label: "Show On Storefront Catalog", type: "boolean" },
    ],
  },
  defineSimple("productTypes", "Product Types", "common_product_types", "product-type"),
  {
    key: "units",
    label: "Units",
    tableName: "common_units",
    idPrefix: "unit",
    defaultSortKey: "name",
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
    idPrefix: "hsn",
    defaultSortKey: "code",
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
    idPrefix: "tax",
    defaultSortKey: "rate_percent",
    columns: [
      { key: "code", label: "Code", type: "string", required: true, nullable: false },
      { key: "name", label: "Name", type: "string", required: true, nullable: false },
      { key: "tax_type", label: "Tax Type", type: "string", required: true, nullable: false },
      {
        key: "rate_percent",
        label: "Rate Percent",
        type: "number",
        numberMode: "decimal",
        required: true,
        nullable: false,
      },
      { key: "description", label: "Description", type: "string", nullable: true },
    ],
  },
  defineSimple("brands", "Brands", "common_brands", "brand"),
  {
    key: "colours",
    label: "Colours",
    tableName: "common_colours",
    idPrefix: "colour",
    defaultSortKey: "name",
    columns: [
      ...codeNameDescription,
      { key: "hex_code", label: "Hex Code", type: "string", nullable: true },
    ],
  },
  {
    key: "sizes",
    label: "Sizes",
    tableName: "common_sizes",
    idPrefix: "size",
    defaultSortKey: "sort_order",
    columns: [
      ...codeNameDescription,
      { key: "sort_order", label: "Sort Order", type: "number", numberMode: "integer" },
    ],
  },
  {
    key: "currencies",
    label: "Currencies",
    tableName: "common_currencies",
    idPrefix: "currency",
    defaultSortKey: "code",
    columns: [
      { key: "code", label: "Code", type: "string", required: true, nullable: false },
      { key: "name", label: "Name", type: "string", required: true, nullable: false },
      { key: "symbol", label: "Symbol", type: "string", required: true, nullable: false },
      { key: "decimal_places", label: "Decimal Places", type: "number", numberMode: "integer" },
    ],
  },
  defineSimple("orderTypes", "Order Types", "common_order_types", "order-type"),
  defineSimple("styles", "Styles", "common_styles", "style"),
  defineSimple("transports", "Transports", "common_transports", "transport"),
  {
    key: "warehouses",
    label: "Warehouses",
    tableName: "common_warehouses",
    idPrefix: "warehouse",
    defaultSortKey: "name",
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
  defineSimple("destinations", "Destinations", "common_destinations", "destination"),
  {
    key: "paymentTerms",
    label: "Payment Terms",
    tableName: "common_payment_terms",
    idPrefix: "payment-term",
    defaultSortKey: "name",
    columns: [
      ...codeNameDescription,
      { key: "due_days", label: "Due Days", type: "number", numberMode: "integer" },
    ],
  },
  {
    key: "accountingYear",
    label: "Accounting Year",
    tableName: "accounting_years",
    idPrefix: "accounting-year",
    defaultSortKey: "start_date",
    columns: [
      { key: "name", label: "Accounting Year", type: "string", required: true, nullable: false },
      { key: "start_date", label: "Start Date", type: "string", required: true, nullable: false },
      { key: "end_date", label: "End Date", type: "string", required: true, nullable: false },
      { key: "books_start", label: "Books Start", type: "string", nullable: true },
    ],
  },
  {
    key: "months",
    label: "Months",
    tableName: "common_months",
    idPrefix: "month",
    defaultSortKey: "start_date",
    columns: [
      { key: "code", label: "Code", type: "string", required: true, nullable: false },
      { key: "name", label: "Name", type: "string", required: true, nullable: false },
      { key: "start_date", label: "Start Date", type: "string", required: true, nullable: false },
      { key: "end_date", label: "End Date", type: "string", required: true, nullable: false },
      { key: "description", label: "Description", type: "string", nullable: true },
    ],
  },
  defineSimple(
    "stockRejectionTypes",
    "Stock Rejection Types",
    "common_stock_rejection_types",
    "stock-rejection-type",
  ),
  {
    key: "storefrontTemplates",
    label: "Storefront Templates",
    tableName: "common_storefront_templates",
    idPrefix: "storefront-template",
    defaultSortKey: "sort_order",
    columns: [
      { key: "code", label: "Code", type: "string", required: true, nullable: false },
      { key: "name", label: "Name", type: "string", required: true, nullable: false },
      { key: "sort_order", label: "Sort Order", type: "number", numberMode: "integer" },
      { key: "badge_text", label: "Badge", type: "string", nullable: true },
      { key: "title", label: "Title", type: "string", required: true, nullable: false },
      { key: "description", label: "Description", type: "string", nullable: true },
      { key: "cta_primary_label", label: "Primary CTA Label", type: "string", nullable: true },
      { key: "cta_primary_href", label: "Primary CTA Href", type: "string", nullable: true },
      { key: "cta_secondary_label", label: "Secondary CTA Label", type: "string", nullable: true },
      { key: "cta_secondary_href", label: "Secondary CTA Href", type: "string", nullable: true },
      { key: "icon_key", label: "Icon Key", type: "string", nullable: true },
      { key: "theme_key", label: "Theme Key", type: "string", nullable: true },
    ],
  },
  {
    key: "sliderThemes",
    label: "Slider Themes",
    tableName: "common_slider_themes",
    idPrefix: "slider-theme",
    defaultSortKey: "sort_order",
    columns: [
      { key: "code", label: "Code", type: "string", required: true, nullable: false },
      { key: "name", label: "Name", type: "string", required: true, nullable: false },
      { key: "sort_order", label: "Sort Order", type: "number", numberMode: "integer" },
      { key: "add_to_cart_label", label: "Add To Cart Label", type: "string", nullable: true },
      { key: "view_details_label", label: "View Details Label", type: "string", nullable: true },
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
      { key: "text_color", label: "Text Color", type: "string", nullable: true },
      { key: "muted_text_color", label: "Muted Text Color", type: "string", nullable: true },
      { key: "badge_background", label: "Badge Background", type: "string", nullable: true },
      { key: "badge_text_color", label: "Badge Text Color", type: "string", nullable: true },
      {
        key: "primary_button_background",
        label: "Primary Button Background",
        type: "string",
        nullable: true,
      },
      {
        key: "primary_button_text_color",
        label: "Primary Button Text",
        type: "string",
        nullable: true,
      },
      {
        key: "secondary_button_background",
        label: "Secondary Button Background",
        type: "string",
        nullable: true,
      },
      {
        key: "secondary_button_text_color",
        label: "Secondary Button Text",
        type: "string",
        nullable: true,
      },
      { key: "nav_background", label: "Nav Background", type: "string", nullable: true },
      { key: "nav_text_color", label: "Nav Text Color", type: "string", nullable: true },
    ],
  },
] as const satisfies readonly CommonModuleDefinition[];

export type CommonModuleKey = (typeof commonModuleDefinitions)[number]["key"];

export function getCommonModuleDefinition(key: string) {
  return commonModuleDefinitions.find((definition) => definition.key === key) ?? null;
}
