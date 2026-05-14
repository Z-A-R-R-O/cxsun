import type { Kysely } from "kysely";

import { defineDatabaseSeeder } from "../process/types";

type DynamicDatabase = Record<string, Record<string, unknown>>;

const timestamp = "2026-04-30 09:00:00";

const productSeeds = [
  {
    uuid: "seed-product-default-example",
    code: "PRD0001",
    name: "-",
    slug: "default-example",
    sku: "-",
    brand_id: null,
    brand_name: null,
    category_id: null,
    category_name: null,
    product_group_id: null,
    product_group_name: null,
    product_type_id: "product-type:finished-good",
    product_type_name: "Finished Good",
    base_price: 0,
    cost_price: 0,
    storefront_department: null,
    primary_image_url: null,
    tag_names: [],
  },
] as const;

function asQueryDatabase(database: Kysely<unknown>) {
  return database as unknown as Kysely<DynamicDatabase>;
}

export const seedProductsSeeder = defineDatabaseSeeder({
  id: "crm:products:001-seed-products",
  appId: "crm",
  moduleKey: "products",
  name: "Seed default products",
  order: 95,
  run: async ({ database }) => {
    const queryDatabase = asQueryDatabase(database);

    for (const product of productSeeds) {
      const existingProduct = await queryDatabase
        .selectFrom("products")
        .select("id")
        .where("code", "=", product.code)
        .executeTakeFirst();

      if (existingProduct) {
        continue;
      }

      const image = {
        id: `${product.uuid}:image:primary`,
        productId: "pending",
        imageUrl: product.primary_image_url,
        isPrimary: true,
        sortOrder: 1,
        isActive: true,
      };
      const price = {
        id: `${product.uuid}:price:default`,
        productId: "pending",
        variantId: null,
        mrp: Math.round(product.base_price * 1.18),
        sellingPrice: product.base_price,
        costPrice: product.cost_price,
        isActive: true,
      };
      const seo = {
        id: `${product.uuid}:seo`,
        productId: "pending",
        metaTitle: product.name,
        metaDescription: `${product.name} shared catalog product.`,
        metaKeywords: product.tag_names.join(", "),
        isActive: true,
      };
      const storefront = {
        id: `${product.uuid}:storefront`,
        productId: "pending",
        department: product.storefront_department,
        homeSliderEnabled: false,
        homeSliderOrder: 0,
        promoSliderEnabled: false,
        promoSliderOrder: 0,
        featureSectionEnabled: false,
        discoveryBoardEnabled: false,
        discoveryBoardOrder: 0,
        visualStripEnabled: false,
        visualStripOrder: 0,
        featureSectionOrder: 0,
        isNewArrival: true,
        isBestSeller: false,
        isFeaturedLabel: false,
        catalogBadge: "Core",
        promoBadge: null,
        promoTitle: null,
        promoSubtitle: null,
        promoCtaLabel: null,
        fabric: null,
        fit: null,
        sleeve: null,
        occasion: null,
        shippingNote: "Shared core seed product.",
        shippingCharge: null,
        handlingCharge: null,
        isActive: true,
      };
      const tags = product.tag_names.map((tagName) => ({
        id: `${product.uuid}:tag:${tagName}`,
        name: tagName,
        isActive: true,
      }));

      await queryDatabase
        .insertInto("products")
        .values({
          uuid: product.uuid,
          code: product.code,
          name: product.name,
          slug: product.slug,
          description: `${product.name} shared product master.`,
          short_description: product.name,
          brand_id: product.brand_id,
          brand_name: product.brand_name,
          category_id: product.category_id,
          category_name: product.category_name,
          product_group_id: product.product_group_id,
          product_group_name: product.product_group_name,
          product_type_id: product.product_type_id,
          product_type_name: product.product_type_name,
          unit_id: "unit:piece",
          hsn_code_id: "hsn:default",
          style_id: "style:default",
          sku: product.sku,
          has_variants: false,
          base_price: product.base_price,
          cost_price: product.cost_price,
          tax_id: "tax:gst-standard",
          is_featured: false,
          is_active: true,
          storefront_department: product.storefront_department,
          home_slider_enabled: false,
          promo_slider_enabled: false,
          feature_section_enabled: false,
          discovery_board_enabled: false,
          discovery_board_order: 0,
          visual_strip_enabled: false,
          visual_strip_order: 0,
          is_new_arrival: true,
          is_best_seller: false,
          is_featured_label: false,
          primary_image_url: product.primary_image_url,
          variant_count: 0,
          attribute_count: 0,
          total_stock_quantity: 0,
          tag_count: tags.length,
          tag_names_json: JSON.stringify(product.tag_names),
          images_json: JSON.stringify([image]),
          variants_json: JSON.stringify([]),
          prices_json: JSON.stringify([price]),
          discounts_json: JSON.stringify([]),
          offers_json: JSON.stringify([]),
          attributes_json: JSON.stringify([]),
          attribute_values_json: JSON.stringify([]),
          variant_map_json: JSON.stringify([]),
          stock_items_json: JSON.stringify([]),
          stock_movements_json: JSON.stringify([]),
          seo_json: JSON.stringify(seo),
          storefront_json: JSON.stringify(storefront),
          tags_json: JSON.stringify(tags),
          reviews_json: JSON.stringify([]),
          created_at: timestamp,
          updated_at: timestamp,
          deleted_at: null,
        })
        .execute();
    }
  },
});
