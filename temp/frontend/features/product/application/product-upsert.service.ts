import {
  getProduct as getProductFromApi,
  upsertProduct as upsertProductFromApi,
} from "../infrastructure/product-api";
import type { ProductUpsertInput } from "../domain/product";

export function getProduct(productId: number, options?: { readonly signal?: AbortSignal }) {
  return getProductFromApi(productId, options);
}

export function upsertProduct(input: ProductUpsertInput, productId?: number) {
  return upsertProductFromApi(input, productId);
}

export function prepareProductForSave(input: ProductUpsertInput): ProductUpsertInput {
  const name = input.name.trim();
  const sku = input.sku.trim().toUpperCase() || makeSku(name);
  const slug = input.slug.trim() || slugify(name);

  return {
    ...input,
    name,
    sku,
    slug,
    code: input.code.trim().toUpperCase(),
    brandName: emptyAsNull(input.brandName),
    categoryName: emptyAsNull(input.categoryName),
    productGroupName: emptyAsNull(input.productGroupName),
    productTypeName: emptyAsNull(input.productTypeName),
    description: emptyAsNull(input.description),
    shortDescription: null,
    images: [],
    tags: [],
  };
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function makeSku(value: string) {
  return slugify(value).replace(/-/g, "_").toUpperCase() || "PRODUCT_SKU";
}

function emptyAsNull(value: string | null) {
  const trimmedValue = value?.trim() ?? "";
  return trimmedValue.length > 0 ? trimmedValue : null;
}
