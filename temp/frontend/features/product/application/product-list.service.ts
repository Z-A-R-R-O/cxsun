import {
  getProduct as getProductFromApi,
  listProducts as listProductsFromApi,
  softDeleteProduct as softDeleteProductFromApi,
} from "../infrastructure/product-api";
import {
  productColumnCatalog,
  type ProductColumnId,
  type ProductRecord,
  type ProductStatusFilter,
} from "../domain/product";

export function listProducts(options?: { readonly signal?: AbortSignal }) {
  return listProductsFromApi(options);
}

export function getProduct(productId: number, options?: { readonly signal?: AbortSignal }) {
  return getProductFromApi(productId, options);
}

export function softDeleteProduct(productId: number) {
  return softDeleteProductFromApi(productId);
}

export function filterProducts({
  products,
  searchValue,
  statusFilter,
}: {
  readonly products: readonly ProductRecord[];
  readonly searchValue: string;
  readonly statusFilter: ProductStatusFilter;
}) {
  const normalizedSearch = searchValue.trim().toLowerCase();

  return products.filter((product) => {
    if (statusFilter === "active" && !product.isActive) {
      return false;
    }

    if (statusFilter === "inactive" && product.isActive) {
      return false;
    }

    if (statusFilter === "featured" && !product.isFeatured) {
      return false;
    }

    if (!normalizedSearch) {
      return true;
    }

    return [
      product.code,
      product.name,
      product.brandName,
      product.categoryName,
      product.productGroupName,
      product.productTypeName,
      product.hsnCodeId,
      product.unitId,
      product.taxId,
    ]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(normalizedSearch));
  });
}

export function buildProductColumnOptions({
  visibleColumns,
  onToggle,
}: {
  readonly visibleColumns: Record<ProductColumnId, boolean>;
  readonly onToggle: (columnId: ProductColumnId, checked: boolean) => void;
}) {
  return productColumnCatalog.map((column) => ({
    id: column.id,
    label: column.label,
    checked: visibleColumns[column.id],
    onCheckedChange: (checked: boolean) => onToggle(column.id, checked),
  }));
}

export function formatProductDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function formatProductMoney(value: number) {
  return new Intl.NumberFormat("en-IN", {
    currency: "INR",
    maximumFractionDigits: 2,
    style: "currency",
  }).format(value);
}
