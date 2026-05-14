import type { ProductRecord } from "../../domain/product-record";

export function toProductResponse(product: ProductRecord) {
  return {
    ...product,
    createdAt: product.createdAt.toISOString(),
    updatedAt: product.updatedAt.toISOString(),
    deletedAt: product.deletedAt?.toISOString() ?? null,
  };
}
