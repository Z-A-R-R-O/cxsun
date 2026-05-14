import type { SalesLookupOption } from "../domain/sales";
import { getRequiredApiUrl } from "@/lib/runtime-env";
import { authFetch } from "../../auth/infrastructure/auth-api";
import { listCommonRecords } from "../../common/infrastructure/common-api";

interface ContactLookupRecord {
  readonly id: string | number;
  readonly code?: string | null;
  readonly contactTypeId?: string | null;
  readonly name?: string | null;
  readonly ledgerName?: string | null;
  readonly legalName?: string | null;
  readonly gstin?: string | null;
  readonly addresses?: readonly ContactLookupAddress[];
}

interface ProductLookupRecord {
  readonly id: string | number;
  readonly code?: string | null;
  readonly name?: string | null;
  readonly sku?: string | null;
  readonly shortDescription?: string | null;
  readonly description?: string | null;
  readonly basePrice?: number | string | null;
  readonly costPrice?: number | string | null;
  readonly taxId?: string | null;
  readonly hsnCodeId?: string | null;
  readonly unitId?: string | null;
  readonly prices?: readonly ProductPriceLookupRecord[];
  readonly variants?: readonly ProductVariantLookupRecord[];
}

interface ContactLookupAddress {
  readonly addressLine1?: string | null;
  readonly addressLine2?: string | null;
  readonly isDefault?: boolean;
  readonly isActive?: boolean;
}

interface ProductPriceLookupRecord {
  readonly mrp?: number | string | null;
  readonly sellingPrice?: number | string | null;
  readonly isActive?: boolean;
}

interface ProductVariantLookupRecord {
  readonly isActive?: boolean;
  readonly attributes?: readonly ProductVariantAttributeLookupRecord[];
}

interface ProductVariantAttributeLookupRecord {
  readonly attributeName?: string | null;
  readonly attributeValue?: string | null;
  readonly isActive?: boolean;
}

type ContactLookupRole = "customer" | "supplier";

export async function listSalesContactLookups(options?: { readonly signal?: AbortSignal }) {
  return listContactLookupsForRole("customer", options);
}

export async function listSupplierContactLookups(options?: { readonly signal?: AbortSignal }) {
  return listContactLookupsForRole("supplier", options);
}

async function listContactLookupsForRole(
  role: ContactLookupRole,
  options?: { readonly signal?: AbortSignal },
) {
  const response = await authFetch(`${apiBaseUrl()}/contacts`, {
    cache: "no-store",
    headers: { Accept: "application/json" },
    signal: options?.signal,
  });

  if (!response.ok) {
    throw new Error(`Contact lookup failed with status ${response.status}.`);
  }

  return ((await response.json()) as ContactLookupRecord[])
    .filter((record) => isContactForLookupRole(record, role))
    .map((record) => {
      const address = resolveContactAddress(record);

      return {
        id: String(record.id),
        label: record.name?.trim() || record.legalName?.trim() || `Contact ${record.id}`,
        secondaryLabel:
          [record.code, record.ledgerName, record.gstin].filter(Boolean).join(" / ") || null,
        billingAddress: address,
        shippingAddress: address,
      };
    }) satisfies SalesLookupOption[];
}

export async function listSalesProductLookups(options?: { readonly signal?: AbortSignal }) {
  const [response, taxes] = await Promise.all([
    authFetch(`${apiBaseUrl()}/products`, {
      cache: "no-store",
      headers: { Accept: "application/json" },
      signal: options?.signal,
    }),
    listCommonRecords("taxes", options).catch(() => []),
  ]);

  if (!response.ok) {
    throw new Error(`Product lookup failed with status ${response.status}.`);
  }

  const taxRateById = new Map(
    taxes.map((tax) => [String(tax.id), Number(tax.ratePercent ?? tax.rate_percent ?? 0)]),
  );

  return ((await response.json()) as ProductLookupRecord[]).map((record) => {
    const price = resolveProductPrice(record);
    const variantAttributes = resolveProductVariantAttributes(record);

    return {
      id: String(record.id),
      label: record.name?.trim() || `Product ${record.id}`,
      secondaryLabel: [record.code, record.sku].filter(Boolean).join(" / ") || null,
      hsnCodeId: record.hsnCodeId ?? null,
      mrp: price.mrp,
      productSku: record.sku ?? null,
      rate: price.rate,
      size: variantAttributes.size,
      colour: variantAttributes.colour,
      taxId: record.taxId ?? null,
      taxRate: record.taxId ? (taxRateById.get(record.taxId) ?? 0) : 0,
      unitId: record.unitId ?? null,
    };
  }) satisfies SalesLookupOption[];
}

function resolveProductVariantAttributes(record: ProductLookupRecord) {
  const variant =
    record.variants?.find((item) => item.isActive !== false && item.attributes?.length) ??
    record.variants?.find((item) => item.attributes?.length);
  const attributes = variant?.attributes?.filter((attribute) => attribute.isActive !== false) ?? [];

  return {
    colour: findVariantAttribute(attributes, ["colour", "color"]),
    size: findVariantAttribute(attributes, ["size"]),
  };
}

function findVariantAttribute(
  attributes: readonly ProductVariantAttributeLookupRecord[],
  names: readonly string[],
) {
  const match = attributes.find((attribute) => {
    const name = attribute.attributeName?.trim().toLowerCase();
    return name ? names.includes(name) : false;
  });
  return match?.attributeValue?.trim() || null;
}

function apiBaseUrl() {
  return getRequiredApiUrl();
}

function resolveContactAddress(record: ContactLookupRecord) {
  const address =
    record.addresses?.find((item) => item.isDefault && item.isActive !== false) ??
    record.addresses?.find((item) => item.isActive !== false) ??
    record.addresses?.[0];

  return [address?.addressLine1, address?.addressLine2]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(", ");
}

function isContactForLookupRole(record: ContactLookupRecord, role: ContactLookupRole) {
  const contactTypeId = record.contactTypeId?.trim().toLowerCase() ?? "";
  const ledgerName = record.ledgerName?.trim().toLowerCase() ?? "";
  if (contactTypeId === "contact-type:vendor-customer" || ledgerName === "vendor customer") {
    return true;
  }
  if (role === "supplier") {
    return (
      contactTypeId === "contact-type:supplier" ||
      ledgerName === "supplier" ||
      ledgerName === "sundry creditors"
    );
  }
  return (
    contactTypeId === "contact-type:customer" ||
    ledgerName === "customer" ||
    ledgerName === "sundry debtors"
  );
}

function resolveProductPrice(record: ProductLookupRecord) {
  const activePrice = record.prices?.find((price) => price.isActive !== false) ?? record.prices?.[0];
  const rate = Number(activePrice?.sellingPrice ?? record.basePrice ?? 0);
  const mrp = Number(activePrice?.mrp ?? record.basePrice ?? 0);

  return {
    mrp: Number.isFinite(mrp) ? mrp : 0,
    rate: Number.isFinite(rate) ? rate : 0,
  };
}
