export interface ProductImageRecord {
  readonly id: string;
  readonly productId: string;
  readonly imageUrl: string;
  readonly isPrimary: boolean;
  readonly sortOrder: number;
  readonly isActive: boolean;
}

export interface ProductVariantRecord {
  readonly id: string;
  readonly productId: string;
  readonly sku: string;
  readonly variantName: string;
  readonly price: number;
  readonly costPrice: number;
  readonly stockQuantity: number;
  readonly openingStock: number;
  readonly weight: number | null;
  readonly barcode: string | null;
  readonly isActive: boolean;
  readonly images: readonly ProductImageRecord[];
  readonly attributes: readonly ProductVariantAttributeRecord[];
}

export interface ProductVariantAttributeRecord {
  readonly id: string;
  readonly variantId: string;
  readonly attributeName: string;
  readonly attributeValue: string;
  readonly isActive: boolean;
}

export interface ProductPriceRecord {
  readonly id: string;
  readonly productId: string;
  readonly variantId: string | null;
  readonly mrp: number;
  readonly sellingPrice: number;
  readonly costPrice: number;
  readonly isActive: boolean;
}

export interface ProductDiscountRecord {
  readonly id: string;
  readonly productId: string;
  readonly variantId: string | null;
  readonly discountType: string;
  readonly discountValue: number;
  readonly startDate: string | null;
  readonly endDate: string | null;
  readonly isActive: boolean;
}

export interface ProductOfferRecord {
  readonly id: string;
  readonly productId: string;
  readonly title: string;
  readonly description: string | null;
  readonly offerPrice: number;
  readonly startDate: string | null;
  readonly endDate: string | null;
  readonly isActive: boolean;
}

export interface ProductAttributeRecord {
  readonly id: string;
  readonly productId: string;
  readonly name: string;
  readonly isActive: boolean;
}

export interface ProductAttributeValueRecord {
  readonly id: string;
  readonly productId: string;
  readonly attributeId: string;
  readonly value: string;
  readonly isActive: boolean;
}

export interface ProductVariantMapRecord {
  readonly id: string;
  readonly productId: string;
  readonly attributeId: string;
  readonly valueId: string;
  readonly isActive: boolean;
}

export interface ProductStockItemRecord {
  readonly id: string;
  readonly productId: string;
  readonly variantId: string | null;
  readonly warehouseId: string;
  readonly quantity: number;
  readonly reservedQuantity: number;
  readonly isActive: boolean;
}

export interface ProductStockMovementRecord {
  readonly id: string;
  readonly productId: string;
  readonly variantId: string | null;
  readonly warehouseId: string | null;
  readonly movementType: string;
  readonly quantity: number;
  readonly referenceType: string | null;
  readonly referenceId: string | null;
  readonly movementAt: string;
  readonly isActive: boolean;
}

export interface ProductSeoRecord {
  readonly id: string;
  readonly productId: string;
  readonly metaTitle: string | null;
  readonly metaDescription: string | null;
  readonly metaKeywords: string | null;
  readonly isActive: boolean;
}

export interface ProductStorefrontRecord {
  readonly id: string;
  readonly productId: string;
  readonly department: string | null;
  readonly homeSliderEnabled: boolean;
  readonly homeSliderOrder: number;
  readonly promoSliderEnabled: boolean;
  readonly promoSliderOrder: number;
  readonly featureSectionEnabled: boolean;
  readonly discoveryBoardEnabled: boolean;
  readonly discoveryBoardOrder: number;
  readonly visualStripEnabled: boolean;
  readonly visualStripOrder: number;
  readonly featureSectionOrder: number;
  readonly isNewArrival: boolean;
  readonly isBestSeller: boolean;
  readonly isFeaturedLabel: boolean;
  readonly catalogBadge: string | null;
  readonly promoBadge: string | null;
  readonly promoTitle: string | null;
  readonly promoSubtitle: string | null;
  readonly promoCtaLabel: string | null;
  readonly fabric: string | null;
  readonly fit: string | null;
  readonly sleeve: string | null;
  readonly occasion: string | null;
  readonly shippingNote: string | null;
  readonly shippingCharge: number | null;
  readonly handlingCharge: number | null;
  readonly isActive: boolean;
}

export interface ProductTagRecord {
  readonly id: string;
  readonly name: string;
  readonly isActive: boolean;
}

export interface ProductReviewRecord {
  readonly id: string;
  readonly productId: string;
  readonly userId: string | null;
  readonly rating: number;
  readonly review: string | null;
  readonly reviewDate: string;
  readonly isActive: boolean;
}

export interface ProductRecord {
  readonly id: string;
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
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly deletedAt: Date | null;
  readonly images: readonly ProductImageRecord[];
  readonly variants: readonly ProductVariantRecord[];
  readonly prices: readonly ProductPriceRecord[];
  readonly discounts: readonly ProductDiscountRecord[];
  readonly offers: readonly ProductOfferRecord[];
  readonly attributes: readonly ProductAttributeRecord[];
  readonly attributeValues: readonly ProductAttributeValueRecord[];
  readonly variantMap: readonly ProductVariantMapRecord[];
  readonly stockItems: readonly ProductStockItemRecord[];
  readonly stockMovements: readonly ProductStockMovementRecord[];
  readonly seo: ProductSeoRecord | null;
  readonly storefront: ProductStorefrontRecord | null;
  readonly tags: readonly ProductTagRecord[];
  readonly reviews: readonly ProductReviewRecord[];
}
