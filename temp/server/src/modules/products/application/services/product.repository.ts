import type { ProductRecord } from "../../domain/product-record";

export interface ProductUpsertParams {
  readonly code?: string | null;
  readonly name: string;
  readonly slug?: string | null;
  readonly description?: string | null;
  readonly shortDescription?: string | null;
  readonly brandId?: string | null;
  readonly brandName?: string | null;
  readonly categoryId?: string | null;
  readonly categoryName?: string | null;
  readonly productGroupId?: string | null;
  readonly productGroupName?: string | null;
  readonly productTypeId?: string | null;
  readonly productTypeName?: string | null;
  readonly unitId?: string | null;
  readonly hsnCodeId?: string | null;
  readonly styleId?: string | null;
  readonly sku: string;
  readonly hasVariants?: boolean;
  readonly basePrice?: number;
  readonly costPrice?: number;
  readonly taxId?: string | null;
  readonly isFeatured?: boolean;
  readonly isActive?: boolean;
  readonly storefrontDepartment?: string | null;
  readonly homeSliderEnabled?: boolean;
  readonly promoSliderEnabled?: boolean;
  readonly featureSectionEnabled?: boolean;
  readonly discoveryBoardEnabled?: boolean;
  readonly discoveryBoardOrder?: number;
  readonly visualStripEnabled?: boolean;
  readonly visualStripOrder?: number;
  readonly isNewArrival?: boolean;
  readonly isBestSeller?: boolean;
  readonly isFeaturedLabel?: boolean;
  readonly images?: readonly ProductNestedInput[];
  readonly variants?: readonly ProductNestedInput[];
  readonly prices?: readonly ProductNestedInput[];
  readonly discounts?: readonly ProductNestedInput[];
  readonly offers?: readonly ProductNestedInput[];
  readonly attributes?: readonly ProductNestedInput[];
  readonly attributeValues?: readonly ProductNestedInput[];
  readonly variantMap?: readonly ProductNestedInput[];
  readonly stockItems?: readonly ProductNestedInput[];
  readonly stockMovements?: readonly ProductNestedInput[];
  readonly seo?: ProductNestedInput | null;
  readonly storefront?: ProductNestedInput | null;
  readonly tags?: readonly ProductNestedInput[];
  readonly reviews?: readonly ProductNestedInput[];
}

export type ProductNestedInput = Record<string, unknown>;

export interface NormalizedProductUpsertParams extends ProductUpsertParams {
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
  readonly images: readonly ProductNestedInput[];
  readonly variants: readonly ProductNestedInput[];
  readonly prices: readonly ProductNestedInput[];
  readonly discounts: readonly ProductNestedInput[];
  readonly offers: readonly ProductNestedInput[];
  readonly attributes: readonly ProductNestedInput[];
  readonly attributeValues: readonly ProductNestedInput[];
  readonly variantMap: readonly ProductNestedInput[];
  readonly stockItems: readonly ProductNestedInput[];
  readonly stockMovements: readonly ProductNestedInput[];
  readonly seo: ProductNestedInput | null;
  readonly storefront: ProductNestedInput | null;
  readonly tags: readonly ProductNestedInput[];
  readonly reviews: readonly ProductNestedInput[];
}

export interface ProductRepository {
  list(): Promise<readonly ProductRecord[]>;
  getById(productId: string): Promise<ProductRecord | null>;
  create(params: NormalizedProductUpsertParams): Promise<ProductRecord>;
  update(productId: string, params: NormalizedProductUpsertParams): Promise<ProductRecord | null>;
  softDelete(productId: string): Promise<boolean>;
}

export const PRODUCT_REPOSITORY = Symbol("PRODUCT_REPOSITORY");
