import type { MasterListColumnOption, MasterListFilterOption } from "@cxnext/ui";

export interface ProductRecord {
  readonly id: number;
  readonly uuid: string;
  readonly code: string;
  readonly name: string;
  readonly slug: string;
  readonly description: string | null;
  readonly shortDescription: string | null;
  readonly brandId: string | null;
  readonly brandName: string | null;
  readonly categoryId: string | null;
  readonly categoryName: string | null;
  readonly productGroupId: string | null;
  readonly productGroupName: string | null;
  readonly productTypeId: string | null;
  readonly productTypeName: string | null;
  readonly unitId: string | null;
  readonly hsnCodeId: string | null;
  readonly styleId: string | null;
  readonly sku: string;
  readonly hasVariants: boolean;
  readonly basePrice: number;
  readonly costPrice: number;
  readonly taxId: string | null;
  readonly isFeatured: boolean;
  readonly isActive: boolean;
  readonly storefrontDepartment: string | null;
  readonly homeSliderEnabled: boolean;
  readonly promoSliderEnabled: boolean;
  readonly featureSectionEnabled: boolean;
  readonly discoveryBoardEnabled: boolean;
  readonly discoveryBoardOrder: number;
  readonly visualStripEnabled: boolean;
  readonly visualStripOrder: number;
  readonly isNewArrival: boolean;
  readonly isBestSeller: boolean;
  readonly isFeaturedLabel: boolean;
  readonly primaryImageUrl: string | null;
  readonly variantCount: number;
  readonly attributeCount: number;
  readonly totalStockQuantity: number;
  readonly tagCount: number;
  readonly tagNames: readonly string[];
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly deletedAt: string | null;
  readonly images: readonly ProductNestedRecord[];
  readonly variants: readonly ProductNestedRecord[];
  readonly prices: readonly ProductNestedRecord[];
  readonly discounts: readonly ProductNestedRecord[];
  readonly offers: readonly ProductNestedRecord[];
  readonly attributes: readonly ProductNestedRecord[];
  readonly attributeValues: readonly ProductNestedRecord[];
  readonly variantMap: readonly ProductNestedRecord[];
  readonly stockItems: readonly ProductNestedRecord[];
  readonly stockMovements: readonly ProductNestedRecord[];
  readonly seo: ProductNestedRecord | null;
  readonly storefront: ProductNestedRecord | null;
  readonly tags: readonly ProductNestedRecord[];
  readonly reviews: readonly ProductNestedRecord[];
}

export type ProductNestedRecord = Record<string, unknown>;

export interface ProductUpsertInput {
  readonly code: string;
  readonly name: string;
  readonly slug: string;
  readonly description: string | null;
  readonly shortDescription: string | null;
  readonly brandId: string | null;
  readonly brandName: string | null;
  readonly categoryId: string | null;
  readonly categoryName: string | null;
  readonly productGroupId: string | null;
  readonly productGroupName: string | null;
  readonly productTypeId: string | null;
  readonly productTypeName: string | null;
  readonly unitId: string | null;
  readonly hsnCodeId: string | null;
  readonly styleId: string | null;
  readonly sku: string;
  readonly hasVariants: boolean;
  readonly basePrice: number;
  readonly costPrice: number;
  readonly taxId: string | null;
  readonly isFeatured: boolean;
  readonly isActive: boolean;
  readonly storefrontDepartment: string | null;
  readonly isNewArrival: boolean;
  readonly isBestSeller: boolean;
  readonly isFeaturedLabel: boolean;
  readonly images: readonly ProductNestedRecord[];
  readonly variants: readonly ProductNestedRecord[];
  readonly prices: readonly ProductNestedRecord[];
  readonly discounts: readonly ProductNestedRecord[];
  readonly offers: readonly ProductNestedRecord[];
  readonly attributes: readonly ProductNestedRecord[];
  readonly attributeValues: readonly ProductNestedRecord[];
  readonly variantMap: readonly ProductNestedRecord[];
  readonly stockItems: readonly ProductNestedRecord[];
  readonly stockMovements: readonly ProductNestedRecord[];
  readonly seo: ProductNestedRecord | null;
  readonly storefront: ProductNestedRecord | null;
  readonly tags: readonly ProductNestedRecord[];
  readonly reviews: readonly ProductNestedRecord[];
}

export type ProductColumnId =
  | "code"
  | "name"
  | "category"
  | "price"
  | "stock"
  | "status"
  | "updated";

export type ProductStatusFilter = "all" | "active" | "inactive" | "featured";
export type ProductColumnOption = MasterListColumnOption;

export const productColumnCatalog: readonly {
  readonly id: ProductColumnId;
  readonly label: string;
}[] = [
  { id: "code", label: "Code" },
  { id: "name", label: "Product" },
  { id: "category", label: "Category" },
  { id: "price", label: "Price" },
  { id: "stock", label: "Stock" },
  { id: "status", label: "Status" },
  { id: "updated", label: "Updated" },
];

export const defaultProductColumnVisibility: Record<ProductColumnId, boolean> = {
  code: true,
  name: true,
  category: true,
  price: true,
  stock: true,
  status: true,
  updated: true,
};

export const productStatusFilters: readonly MasterListFilterOption[] = [
  { id: "all", label: "All products" },
  { id: "active", label: "active" },
  { id: "inactive", label: "inactive" },
  { id: "featured", label: "featured" },
];
