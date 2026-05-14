import { randomUUID } from "node:crypto";
import { ProductCode } from "../../domain/value-objects/product-code.value-object";
import {
  ProductSlug,
  slugifyProductText,
} from "../../domain/value-objects/product-slug.value-object";
import type { ProductRecord } from "../../domain/product-record";
import type {
  NormalizedProductUpsertParams,
  ProductNestedInput,
  ProductUpsertParams,
} from "../services/product.repository";

export function normalizeProductUpsert(
  params: ProductUpsertParams,
  products: readonly ProductRecord[],
  existing?: ProductRecord,
): NormalizedProductUpsertParams {
  const code = ProductCode.create(resolveProductCode(params, products, existing)).value;
  const slug = ProductSlug.create(params.slug?.trim() || params.name).value;
  const productId = existing?.id ?? "pending";
  const images = withProductIds(params.images ?? [], productId, "product-image", existing?.images);
  const tags = normalizeTags(params.tags ?? [], existing);
  const storefront = normalizeStorefront(params.storefront ?? null, productId, params, existing);

  return {
    code,
    name: params.name.trim(),
    slug,
    description: emptyAsNull(params.description),
    shortDescription: emptyAsNull(params.shortDescription),
    brandId: emptyAsNull(params.brandId),
    brandName: emptyAsNull(params.brandName),
    categoryId: emptyAsNull(params.categoryId),
    categoryName: emptyAsNull(params.categoryName),
    productGroupId: emptyAsNull(params.productGroupId),
    productGroupName: emptyAsNull(params.productGroupName),
    productTypeId: emptyAsNull(params.productTypeId),
    productTypeName: emptyAsNull(params.productTypeName),
    unitId: emptyAsNull(params.unitId),
    hsnCodeId: emptyAsNull(params.hsnCodeId),
    styleId: emptyAsNull(params.styleId),
    sku: params.sku.trim().toUpperCase(),
    hasVariants: params.hasVariants ?? false,
    basePrice: Number(params.basePrice ?? 0),
    costPrice: Number(params.costPrice ?? 0),
    taxId: emptyAsNull(params.taxId),
    isFeatured: params.isFeatured ?? false,
    isActive: params.isActive ?? true,
    storefrontDepartment: emptyAsNull(params.storefrontDepartment),
    homeSliderEnabled: params.homeSliderEnabled ?? false,
    promoSliderEnabled: params.promoSliderEnabled ?? false,
    featureSectionEnabled: params.featureSectionEnabled ?? false,
    discoveryBoardEnabled: params.discoveryBoardEnabled ?? false,
    discoveryBoardOrder: Number(params.discoveryBoardOrder ?? 0),
    visualStripEnabled: params.visualStripEnabled ?? false,
    visualStripOrder: Number(params.visualStripOrder ?? 0),
    isNewArrival: params.isNewArrival ?? false,
    isBestSeller: params.isBestSeller ?? false,
    isFeaturedLabel: params.isFeaturedLabel ?? false,
    images,
    variants: withProductIds(
      params.variants ?? [],
      productId,
      "product-variant",
      existing?.variants,
    ),
    prices: withProductIds(params.prices ?? [], productId, "product-price", existing?.prices),
    discounts: withProductIds(
      params.discounts ?? [],
      productId,
      "product-discount",
      existing?.discounts,
    ),
    offers: withProductIds(params.offers ?? [], productId, "product-offer", existing?.offers),
    attributes: withProductIds(
      params.attributes ?? [],
      productId,
      "product-attribute",
      existing?.attributes,
    ),
    attributeValues: withProductIds(
      params.attributeValues ?? [],
      productId,
      "product-attribute-value",
      existing?.attributeValues,
    ),
    variantMap: withProductIds(
      params.variantMap ?? [],
      productId,
      "product-variant-map",
      existing?.variantMap,
    ),
    stockItems: withProductIds(
      params.stockItems ?? [],
      productId,
      "product-stock",
      existing?.stockItems,
    ),
    stockMovements: withProductIds(
      params.stockMovements ?? [],
      productId,
      "product-stock-movement",
      existing?.stockMovements,
    ),
    seo: normalizeSeo(params.seo ?? null, productId, params, existing),
    storefront,
    tags,
    reviews: withProductIds(params.reviews ?? [], productId, "product-review", existing?.reviews),
  };
}

export function assertProductCanBeSaved(
  products: readonly ProductRecord[],
  params: NormalizedProductUpsertParams,
  existingId?: string,
): void {
  if (params.name.trim().length < 2) {
    throw new Error("Product name must be at least 2 characters.");
  }

  if (params.sku.trim().length < 2) {
    throw new Error("Product SKU must be at least 2 characters.");
  }

  for (const product of products) {
    if (existingId && product.id === existingId) {
      continue;
    }

    if (product.code.trim().toUpperCase() === params.code) {
      throw new Error(`Product code "${params.code}" already exists.`);
    }

    if (product.sku.trim().toUpperCase() === params.sku) {
      throw new Error(`Product SKU "${params.sku}" already exists.`);
    }

    if (product.slug.trim().toLowerCase() === params.slug) {
      throw new Error(`Product slug "${params.slug}" already exists.`);
    }
  }
}

function resolveProductCode(
  params: ProductUpsertParams,
  products: readonly ProductRecord[],
  existing?: ProductRecord,
) {
  const requestedCode = params.code?.trim().toUpperCase() ?? "";

  if (requestedCode && requestedCode !== "-") {
    return requestedCode;
  }

  let nextNumber = 1;
  for (const product of products) {
    if (existing && product.id === existing.id) {
      continue;
    }
    const match = /^PRD(\d+)$/i.exec(product.code.trim());
    if (match) {
      nextNumber = Math.max(nextNumber, Number.parseInt(match[1] ?? "0", 10) + 1);
    }
  }

  return `PRD${String(nextNumber).padStart(4, "0")}`;
}

function withProductIds(
  items: readonly ProductNestedInput[],
  productId: string,
  prefix: string,
  existing: readonly { readonly id: string }[] = [],
) {
  return items.map((item, index) => ({
    id:
      typeof item.id === "string" ? item.id : (existing[index]?.id ?? `${prefix}:${randomUUID()}`),
    productId,
    ...item,
  }));
}

function normalizeTags(items: readonly ProductNestedInput[], existing?: ProductRecord) {
  return items
    .map((item, index) => ({
      id:
        typeof item.id === "string"
          ? item.id
          : (existing?.tags[index]?.id ?? `product-tag:${randomUUID()}`),
      name: String(item.name ?? "").trim(),
      isActive: typeof item.isActive === "boolean" ? item.isActive : true,
    }))
    .filter((item) => item.name.length > 0);
}

function normalizeSeo(
  item: ProductNestedInput | null,
  productId: string,
  params: ProductUpsertParams,
  existing?: ProductRecord,
) {
  if (!item && !params.name) {
    return null;
  }

  return {
    id:
      typeof item?.id === "string" ? item.id : (existing?.seo?.id ?? `product-seo:${randomUUID()}`),
    productId,
    metaTitle: emptyAsNull(String(item?.metaTitle ?? params.name ?? "")),
    metaDescription: emptyAsNull(String(item?.metaDescription ?? params.shortDescription ?? "")),
    metaKeywords: emptyAsNull(String(item?.metaKeywords ?? "")),
    isActive: typeof item?.isActive === "boolean" ? item.isActive : true,
  };
}

function normalizeStorefront(
  item: ProductNestedInput | null,
  productId: string,
  params: ProductUpsertParams,
  existing?: ProductRecord,
) {
  if (!item && !params.storefrontDepartment) {
    return null;
  }

  return {
    id:
      typeof item?.id === "string"
        ? item.id
        : (existing?.storefront?.id ?? `product-storefront:${randomUUID()}`),
    productId,
    department: emptyAsNull(String(item?.department ?? params.storefrontDepartment ?? "")),
    homeSliderEnabled: Boolean(item?.homeSliderEnabled ?? params.homeSliderEnabled ?? false),
    homeSliderOrder: Number(item?.homeSliderOrder ?? 0),
    promoSliderEnabled: Boolean(item?.promoSliderEnabled ?? params.promoSliderEnabled ?? false),
    promoSliderOrder: Number(item?.promoSliderOrder ?? 0),
    featureSectionEnabled: Boolean(
      item?.featureSectionEnabled ?? params.featureSectionEnabled ?? false,
    ),
    discoveryBoardEnabled: Boolean(
      item?.discoveryBoardEnabled ?? params.discoveryBoardEnabled ?? false,
    ),
    discoveryBoardOrder: Number(item?.discoveryBoardOrder ?? params.discoveryBoardOrder ?? 0),
    visualStripEnabled: Boolean(item?.visualStripEnabled ?? params.visualStripEnabled ?? false),
    visualStripOrder: Number(item?.visualStripOrder ?? params.visualStripOrder ?? 0),
    featureSectionOrder: Number(item?.featureSectionOrder ?? 0),
    isNewArrival: Boolean(item?.isNewArrival ?? params.isNewArrival ?? false),
    isBestSeller: Boolean(item?.isBestSeller ?? params.isBestSeller ?? false),
    isFeaturedLabel: Boolean(item?.isFeaturedLabel ?? params.isFeaturedLabel ?? false),
    catalogBadge: emptyAsNull(String(item?.catalogBadge ?? "")),
    promoBadge: emptyAsNull(String(item?.promoBadge ?? "")),
    promoTitle: emptyAsNull(String(item?.promoTitle ?? "")),
    promoSubtitle: emptyAsNull(String(item?.promoSubtitle ?? "")),
    promoCtaLabel: emptyAsNull(String(item?.promoCtaLabel ?? "")),
    fabric: emptyAsNull(String(item?.fabric ?? "")),
    fit: emptyAsNull(String(item?.fit ?? "")),
    sleeve: emptyAsNull(String(item?.sleeve ?? "")),
    occasion: emptyAsNull(String(item?.occasion ?? "")),
    shippingNote: emptyAsNull(String(item?.shippingNote ?? "")),
    shippingCharge: numberOrNull(item?.shippingCharge),
    handlingCharge: numberOrNull(item?.handlingCharge),
    isActive: typeof item?.isActive === "boolean" ? item.isActive : true,
  };
}

function emptyAsNull(value: string | null | undefined) {
  const trimmedValue = value?.trim() ?? "";
  return trimmedValue.length > 0 && trimmedValue !== "1" && trimmedValue !== "-"
    ? trimmedValue
    : null;
}

function numberOrNull(value: unknown) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
}

export function generateProductSlug(text: string): string {
  return slugifyProductText(text);
}

export function generateProductSeoField(params: {
  readonly field: "metaTitle" | "metaDescription" | "metaKeywords";
  readonly name: string;
  readonly description?: string | null;
  readonly shortDescription?: string | null;
  readonly brandName?: string | null;
  readonly categoryName?: string | null;
  readonly productGroupName?: string | null;
  readonly tagNames?: readonly string[];
}): string {
  if (params.field === "metaTitle") {
    return params.name.trim();
  }

  if (params.field === "metaDescription") {
    return (
      params.description?.trim() ||
      params.shortDescription?.trim() ||
      `${params.name.trim()} product.`
    );
  }

  return [
    params.name,
    params.brandName,
    params.categoryName,
    params.productGroupName,
    ...(params.tagNames ?? []),
  ]
    .map((value) => value?.trim() ?? "")
    .filter(Boolean)
    .join(", ");
}
