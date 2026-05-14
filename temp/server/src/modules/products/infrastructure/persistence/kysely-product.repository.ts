import { randomUUID } from "node:crypto";
import { Injectable, type OnModuleDestroy } from "@nestjs/common";
import { createDatabaseConnection, loadDatabaseEnv, type DatabaseConnection } from "@cxnext/db";
import type {
  NormalizedProductUpsertParams,
  ProductRepository,
} from "../../application/services/product.repository";
import type { ProductRecord } from "../../domain/product-record";

type DateValue = Date | string;

interface ProductRow {
  readonly id: number;
  readonly uuid: string;
  readonly code: string;
  readonly name: string;
  readonly slug: string;
  readonly description: string | null;
  readonly short_description: string | null;
  readonly brand_id: string | null;
  readonly brand_name: string | null;
  readonly category_id: string | null;
  readonly category_name: string | null;
  readonly product_group_id: string | null;
  readonly product_group_name: string | null;
  readonly product_type_id: string | null;
  readonly product_type_name: string | null;
  readonly unit_id: string | null;
  readonly hsn_code_id: string | null;
  readonly style_id: string | null;
  readonly sku: string;
  readonly has_variants: boolean | number;
  readonly base_price: string | number;
  readonly cost_price: string | number;
  readonly tax_id: string | null;
  readonly is_featured: boolean | number;
  readonly is_active: boolean | number;
  readonly storefront_department: string | null;
  readonly home_slider_enabled: boolean | number;
  readonly promo_slider_enabled: boolean | number;
  readonly feature_section_enabled: boolean | number;
  readonly discovery_board_enabled: boolean | number;
  readonly discovery_board_order: number;
  readonly visual_strip_enabled: boolean | number;
  readonly visual_strip_order: number;
  readonly is_new_arrival: boolean | number;
  readonly is_best_seller: boolean | number;
  readonly is_featured_label: boolean | number;
  readonly primary_image_url: string | null;
  readonly variant_count: number;
  readonly attribute_count: number;
  readonly total_stock_quantity: string | number;
  readonly tag_count: number;
  readonly tag_names_json: unknown;
  readonly images_json: unknown;
  readonly variants_json: unknown;
  readonly prices_json: unknown;
  readonly discounts_json: unknown;
  readonly offers_json: unknown;
  readonly attributes_json: unknown;
  readonly attribute_values_json: unknown;
  readonly variant_map_json: unknown;
  readonly stock_items_json: unknown;
  readonly stock_movements_json: unknown;
  readonly seo_json: unknown;
  readonly storefront_json: unknown;
  readonly tags_json: unknown;
  readonly reviews_json: unknown;
  readonly created_at: DateValue;
  readonly updated_at: DateValue;
  readonly deleted_at: DateValue | null;
}

@Injectable()
export class KyselyProductRepository implements ProductRepository, OnModuleDestroy {
  private readonly connection: DatabaseConnection;

  public constructor() {
    this.connection = createDatabaseConnection(loadDatabaseEnv().env);
  }

  public async onModuleDestroy(): Promise<void> {
    await this.connection.destroy();
  }

  public async list(): Promise<readonly ProductRecord[]> {
    const rows = await this.connection.db
      .selectFrom("products")
      .selectAll()
      .where("deleted_at", "is", null)
      .orderBy("name", "asc")
      .execute();

    return rows.map((row) => toProductRecord(row as ProductRow));
  }

  public async getById(productId: string): Promise<ProductRecord | null> {
    const numericProductId = Number(productId);

    if (!Number.isInteger(numericProductId)) {
      return null;
    }

    const row = await this.connection.db
      .selectFrom("products")
      .selectAll()
      .where("id", "=", numericProductId)
      .where("deleted_at", "is", null)
      .executeTakeFirst();

    return row ? toProductRecord(row as ProductRow) : null;
  }

  public async create(params: NormalizedProductUpsertParams): Promise<ProductRecord> {
    const now = new Date();
    const values = toProductValues(params, now, randomUUID());
    const result = await this.connection.db
      .insertInto("products")
      .values(values)
      .executeTakeFirstOrThrow();
    const productId = String(Number(result.insertId));
    await this.connection.db
      .updateTable("products")
      .set(toNestedJsonValues(params, productId))
      .where("id", "=", Number(productId))
      .executeTakeFirst();

    const product = await this.getById(productId);

    if (!product) {
      throw new Error("Product was created but could not be read back.");
    }

    return product;
  }

  public async update(
    productId: string,
    params: NormalizedProductUpsertParams,
  ): Promise<ProductRecord | null> {
    const numericProductId = Number(productId);

    if (!Number.isInteger(numericProductId)) {
      return null;
    }

    await this.connection.db
      .updateTable("products")
      .set({
        ...toProductUpdateValues(params, new Date()),
        ...toNestedJsonValues(params, productId),
      })
      .where("id", "=", numericProductId)
      .where("deleted_at", "is", null)
      .executeTakeFirst();

    return this.getById(productId);
  }

  public async softDelete(productId: string): Promise<boolean> {
    const numericProductId = Number(productId);

    if (!Number.isInteger(numericProductId)) {
      return false;
    }

    const result = await this.connection.db
      .updateTable("products")
      .set({
        deleted_at: new Date(),
        updated_at: new Date(),
      })
      .where("id", "=", numericProductId)
      .where("deleted_at", "is", null)
      .executeTakeFirst();

    return Number(result.numUpdatedRows) > 0;
  }
}

function toProductValues(params: NormalizedProductUpsertParams, timestamp: Date, uuid: string) {
  const images = replaceProductIds(params.images, "pending");
  const tags = replaceProductIds(params.tags, "pending");

  return {
    uuid,
    code: params.code,
    name: params.name,
    slug: params.slug,
    description: params.description,
    short_description: params.shortDescription,
    brand_id: params.brandId,
    brand_name: params.brandName,
    category_id: params.categoryId,
    category_name: params.categoryName,
    product_group_id: params.productGroupId,
    product_group_name: params.productGroupName,
    product_type_id: params.productTypeId,
    product_type_name: params.productTypeName,
    unit_id: params.unitId,
    hsn_code_id: params.hsnCodeId,
    style_id: params.styleId,
    sku: params.sku,
    has_variants: params.hasVariants,
    base_price: params.basePrice,
    cost_price: params.costPrice,
    tax_id: params.taxId,
    is_featured: params.isFeatured,
    is_active: params.isActive,
    storefront_department:
      stringOrNull(params.storefront?.department) ?? params.storefrontDepartment,
    home_slider_enabled: Boolean(params.storefront?.homeSliderEnabled ?? params.homeSliderEnabled),
    promo_slider_enabled: Boolean(
      params.storefront?.promoSliderEnabled ?? params.promoSliderEnabled,
    ),
    feature_section_enabled: Boolean(
      params.storefront?.featureSectionEnabled ?? params.featureSectionEnabled,
    ),
    discovery_board_enabled: Boolean(
      params.storefront?.discoveryBoardEnabled ?? params.discoveryBoardEnabled,
    ),
    discovery_board_order: Number(
      params.storefront?.discoveryBoardOrder ?? params.discoveryBoardOrder,
    ),
    visual_strip_enabled: Boolean(
      params.storefront?.visualStripEnabled ?? params.visualStripEnabled,
    ),
    visual_strip_order: Number(params.storefront?.visualStripOrder ?? params.visualStripOrder),
    is_new_arrival: Boolean(params.storefront?.isNewArrival ?? params.isNewArrival),
    is_best_seller: Boolean(params.storefront?.isBestSeller ?? params.isBestSeller),
    is_featured_label: Boolean(params.storefront?.isFeaturedLabel ?? params.isFeaturedLabel),
    primary_image_url: getPrimaryImageUrl(images),
    variant_count: params.variants.length,
    attribute_count: params.attributes.length,
    total_stock_quantity: totalStockQuantity(params),
    tag_count: tags.length,
    ...toNestedJsonValues(params, "pending"),
    created_at: timestamp,
    updated_at: timestamp,
    deleted_at: null,
  };
}

function toProductUpdateValues(params: NormalizedProductUpsertParams, timestamp: Date) {
  const values: Partial<ReturnType<typeof toProductValues>> = toProductValues(
    params,
    timestamp,
    "unused-update-uuid",
  );
  delete values.created_at;
  delete values.deleted_at;
  delete values.uuid;

  return values;
}

function toNestedJsonValues(params: NormalizedProductUpsertParams, productId: string) {
  const tags = replaceProductIds(params.tags, productId);

  return {
    tag_names_json: stringifyJson(tags.map((tag) => String(tag.name ?? "")).filter(Boolean)),
    images_json: stringifyJson(replaceProductIds(params.images, productId)),
    variants_json: stringifyJson(replaceProductIds(params.variants, productId)),
    prices_json: stringifyJson(replaceProductIds(params.prices, productId)),
    discounts_json: stringifyJson(replaceProductIds(params.discounts, productId)),
    offers_json: stringifyJson(replaceProductIds(params.offers, productId)),
    attributes_json: stringifyJson(replaceProductIds(params.attributes, productId)),
    attribute_values_json: stringifyJson(replaceProductIds(params.attributeValues, productId)),
    variant_map_json: stringifyJson(replaceProductIds(params.variantMap, productId)),
    stock_items_json: stringifyJson(replaceProductIds(params.stockItems, productId)),
    stock_movements_json: stringifyJson(replaceProductIds(params.stockMovements, productId)),
    seo_json: stringifyJson(params.seo ? { ...params.seo, productId } : null),
    storefront_json: stringifyJson(params.storefront ? { ...params.storefront, productId } : null),
    tags_json: stringifyJson(tags),
    reviews_json: stringifyJson(replaceProductIds(params.reviews, productId)),
  };
}

function toProductRecord(row: ProductRow): ProductRecord {
  const productId = String(row.id);
  const images = normalizeProductIds(readJsonArray(row.images_json), productId);
  const tags = readJsonArray(row.tags_json);

  return {
    id: String(row.id),
    uuid: row.uuid,
    code: row.code,
    name: row.name,
    slug: row.slug,
    description: row.description,
    shortDescription: row.short_description,
    brandId: row.brand_id,
    brandName: row.brand_name,
    categoryId: row.category_id,
    categoryName: row.category_name,
    productGroupId: row.product_group_id,
    productGroupName: row.product_group_name,
    productTypeId: row.product_type_id,
    productTypeName: row.product_type_name,
    unitId: row.unit_id,
    hsnCodeId: row.hsn_code_id,
    styleId: row.style_id,
    sku: row.sku,
    hasVariants: Boolean(row.has_variants),
    basePrice: Number(row.base_price),
    costPrice: Number(row.cost_price),
    taxId: row.tax_id,
    isFeatured: Boolean(row.is_featured),
    isActive: Boolean(row.is_active),
    storefrontDepartment: row.storefront_department,
    homeSliderEnabled: Boolean(row.home_slider_enabled),
    promoSliderEnabled: Boolean(row.promo_slider_enabled),
    featureSectionEnabled: Boolean(row.feature_section_enabled),
    discoveryBoardEnabled: Boolean(row.discovery_board_enabled),
    discoveryBoardOrder: Number(row.discovery_board_order),
    visualStripEnabled: Boolean(row.visual_strip_enabled),
    visualStripOrder: Number(row.visual_strip_order),
    isNewArrival: Boolean(row.is_new_arrival),
    isBestSeller: Boolean(row.is_best_seller),
    isFeaturedLabel: Boolean(row.is_featured_label),
    primaryImageUrl: row.primary_image_url ?? getPrimaryImageUrl(images),
    variantCount: Number(row.variant_count),
    attributeCount: Number(row.attribute_count),
    totalStockQuantity: Number(row.total_stock_quantity),
    tagCount: Number(row.tag_count),
    tagNames: readJsonArray(row.tag_names_json).map(String),
    createdAt: toDate(row.created_at),
    updatedAt: toDate(row.updated_at),
    deletedAt: row.deleted_at ? toDate(row.deleted_at) : null,
    images: images as ProductRecord["images"],
    variants: normalizeProductIds(
      readJsonArray(row.variants_json),
      productId,
    ) as ProductRecord["variants"],
    prices: normalizeProductIds(
      readJsonArray(row.prices_json),
      productId,
    ) as ProductRecord["prices"],
    discounts: normalizeProductIds(
      readJsonArray(row.discounts_json),
      productId,
    ) as ProductRecord["discounts"],
    offers: normalizeProductIds(
      readJsonArray(row.offers_json),
      productId,
    ) as ProductRecord["offers"],
    attributes: normalizeProductIds(
      readJsonArray(row.attributes_json),
      productId,
    ) as ProductRecord["attributes"],
    attributeValues: normalizeProductIds(
      readJsonArray(row.attribute_values_json),
      productId,
    ) as ProductRecord["attributeValues"],
    variantMap: normalizeProductIds(
      readJsonArray(row.variant_map_json),
      productId,
    ) as ProductRecord["variantMap"],
    stockItems: normalizeProductIds(
      readJsonArray(row.stock_items_json),
      productId,
    ) as ProductRecord["stockItems"],
    stockMovements: normalizeProductIds(
      readJsonArray(row.stock_movements_json),
      productId,
    ) as ProductRecord["stockMovements"],
    seo: normalizeProductObject(readJsonObject(row.seo_json), productId) as ProductRecord["seo"],
    storefront: normalizeProductObject(
      readJsonObject(row.storefront_json),
      productId,
    ) as ProductRecord["storefront"],
    tags: tags as ProductRecord["tags"],
    reviews: readJsonArray(row.reviews_json) as ProductRecord["reviews"],
  };
}

function replaceProductIds<T extends Record<string, unknown>>(
  items: readonly T[],
  productId: string,
) {
  return items.map((item) => ({ ...item, productId }));
}

function normalizeProductIds(items: readonly unknown[], productId: string) {
  return items.map((item) =>
    item && typeof item === "object" ? { ...(item as Record<string, unknown>), productId } : item,
  );
}

function normalizeProductObject(item: Record<string, unknown> | null, productId: string) {
  return item ? { ...item, productId } : null;
}

function totalStockQuantity(params: NormalizedProductUpsertParams) {
  return params.stockItems.reduce((sum, item) => sum + Number(item.quantity ?? 0), 0);
}

function getPrimaryImageUrl(images: readonly unknown[]) {
  const imageRecords = images.filter(
    (image): image is Record<string, unknown> => typeof image === "object" && image !== null,
  );
  const primary = imageRecords.find((image) => image.isPrimary === true) ?? imageRecords[0];
  return typeof primary?.imageUrl === "string" ? primary.imageUrl : null;
}

function stringifyJson(value: unknown) {
  return JSON.stringify(value);
}

function stringOrNull(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function readJsonArray(value: unknown): unknown[] {
  const parsed = readJson(value);
  return Array.isArray(parsed) ? parsed : [];
}

function readJsonObject(value: unknown): Record<string, unknown> | null {
  const parsed = readJson(value);
  return parsed && typeof parsed === "object" && !Array.isArray(parsed)
    ? (parsed as Record<string, unknown>)
    : null;
}

function readJson(value: unknown): unknown {
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }

  return value;
}

function toDate(value: DateValue): Date {
  return value instanceof Date ? value : new Date(value);
}
