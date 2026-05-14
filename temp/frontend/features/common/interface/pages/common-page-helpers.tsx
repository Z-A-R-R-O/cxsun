import { Badge, type CommonListColumnOption, type CommonListFilterOption } from "@cxnext/ui";
import {
  listCommonReferenceLookups,
  listCommonRecords,
  type CommonColumnDefinition,
  type CommonModuleDefinition,
  type CommonReferenceLookupMap,
  type CommonRecord,
} from "../../application/common-service";

export function StatusBadge({ active }: { readonly active: boolean }) {
  return (
    <Badge
      variant="outline"
      className={
        active
          ? "rounded-full border-emerald-200 bg-emerald-50 text-emerald-700"
          : "rounded-full border-border/80 text-muted-foreground"
      }
    >
      {active ? "active" : "inactive"}
    </Badge>
  );
}

export const commonStatusFilters: readonly CommonListFilterOption[] = [
  { id: "all", label: "All records" },
  { id: "active", label: "active" },
  { id: "inactive", label: "inactive" },
];

export function buildDefaultColumnVisibility(definition: CommonModuleDefinition) {
  return Object.fromEntries([
    ...definition.columns.map((column) => [column.key, true] as const),
    ["status", true] as const,
    ["updated", true] as const,
  ]);
}

export function buildCommonColumnOptions(params: {
  readonly definition: CommonModuleDefinition;
  readonly visibleColumns: Record<string, boolean>;
  onToggle(columnId: string, checked: boolean): void;
}): readonly CommonListColumnOption[] {
  const columns = [
    ...params.definition.columns.map((column) => ({ id: column.key, label: column.label })),
    { id: "status", label: "Status" },
    { id: "updated", label: "Updated" },
  ];
  const visibleCount = columns.filter((column) => params.visibleColumns[column.id]).length;

  return columns.map((column) => ({
    id: column.id,
    label: column.label,
    checked: Boolean(params.visibleColumns[column.id]),
    disabled: Boolean(params.visibleColumns[column.id]) && visibleCount === 1,
    onCheckedChange: (checked) => params.onToggle(column.id, checked),
  }));
}

const moduleDescriptions: Record<string, string> = {
  countries: "Maintain countries used across addresses, tax, and dialling defaults.",
  states: "Maintain state and province records used by location workflows.",
  districts: "Maintain district records for city and pincode mapping.",
  cities: "Maintain cities used in address and logistics flows.",
  pincodes: "Maintain postal areas and their location mapping.",
  contactGroups: "Classify contacts into customer, vendor, and related groups.",
  contactTypes: "Maintain contact roles used for communication and follow-up.",
  addressTypes: "Maintain address labels such as billing and shipping.",
  bankNames: "Maintain bank names used in account and payment records.",
  productGroups: "Organise products into high-level catalogue groups.",
  productCategories: "Maintain product categories used for catalogue and storefront behaviour.",
  productTypes: "Maintain product type choices for stock and service items.",
  brands: "Maintain brand names used in product records.",
  colours: "Maintain colour options used by product variants.",
  sizes: "Maintain size options used by product variants.",
  styles: "Maintain style options used by product variants.",
  units: "Maintain measuring units used in product and stock entries.",
  hsnCodes: "Maintain HSN codes used for product tax classification.",
  taxes: "Maintain tax rates and labels used in billing workflows.",
  warehouses: "Maintain warehouse locations used for stock movement.",
  transports: "Maintain transport modes and partners used in dispatch.",
  destinations: "Maintain destination labels used in order routing.",
  orderTypes: "Maintain order type choices used by sales and purchase flows.",
  stockRejectionTypes: "Maintain rejection reasons used in stock quality workflows.",
  currencies: "Maintain currencies used for pricing and accounting.",
  paymentTerms: "Maintain payment terms used in customer and vendor transactions.",
  months: "Maintain reporting months with opening and closing date ranges.",
  accountingYear: "Maintain financial periods that can be referenced across the workspace.",
};

export function getModuleDescription(moduleKey: string, label: string) {
  return (
    moduleDescriptions[moduleKey] ??
    `Maintain ${label.toLowerCase()} records used across the workspace.`
  );
}

export function buildDraft(definition: CommonModuleDefinition, record: CommonRecord | null) {
  const draft: Record<string, unknown> = { isActive: record?.isActive ?? true };

  for (const column of definition.columns) {
    const key = toCamelCase(column.key);
    draft[key] =
      record?.[key] ?? (column.type === "boolean" ? false : column.type === "number" ? 0 : "");
  }

  return draft;
}

export function validateDraft(definition: CommonModuleDefinition, draft: Record<string, unknown>) {
  for (const column of definition.columns) {
    const value = draft[toCamelCase(column.key)];

    if (
      (column.required || column.nullable === false) &&
      column.type === "string" &&
      !String(value ?? "").trim()
    ) {
      return `${column.label} is required.`;
    }
  }

  return null;
}

export function formatValue(
  value: unknown,
  column: CommonColumnDefinition,
  referenceLookups: CommonReferenceLookupMap,
) {
  if (column.type === "boolean") {
    return <StatusBadge active={Boolean(value)} />;
  }

  if (value === null || value === undefined || value === "") {
    return "-";
  }

  const referenceValue = referenceLookups[column.key]?.get(String(value));

  if (referenceValue) {
    return referenceValue;
  }

  return String(value);
}

export function toCamelCase(value: string) {
  return value.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase());
}

export async function loadRecordsAndLookups(
  moduleKey: string,
  definition: CommonModuleDefinition | null,
  options?: { readonly signal?: AbortSignal },
) {
  const [records, referenceLookups] = await Promise.all([
    listCommonRecords(moduleKey, options),
    definition ? listCommonReferenceLookups(definition, options) : Promise.resolve({}),
  ]);

  return { records, referenceLookups };
}
