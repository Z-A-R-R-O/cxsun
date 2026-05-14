import { sql, type Kysely } from "kysely";

import { defineDatabaseMigration } from "../process/types";

type DynamicDatabase = Record<string, Record<string, unknown>>;

function asQueryDatabase(database: Kysely<unknown>) {
  return database as unknown as Kysely<DynamicDatabase>;
}

export const createProductsMigration = defineDatabaseMigration({
  id: "crm:products:001-create-products",
  appId: "crm",
  moduleKey: "products",
  name: "Create products master table",
  order: 95,
  up: async ({ database }) => {
    const queryDatabase = asQueryDatabase(database);

    await queryDatabase.schema
      .createTable("products")
      .ifNotExists()
      .addColumn("id", "bigint", (column) => column.primaryKey().autoIncrement())
      .addColumn("uuid", "varchar(80)", (column) => column.notNull())
      .addColumn("code", "varchar(60)", (column) => column.notNull())
      .addColumn("name", "varchar(220)", (column) => column.notNull())
      .addColumn("slug", "varchar(240)", (column) => column.notNull())
      .addColumn("description", "text")
      .addColumn("short_description", "text")
      .addColumn("brand_id", "varchar(120)")
      .addColumn("brand_name", "varchar(180)")
      .addColumn("category_id", "varchar(120)")
      .addColumn("category_name", "varchar(180)")
      .addColumn("product_group_id", "varchar(120)")
      .addColumn("product_group_name", "varchar(180)")
      .addColumn("product_type_id", "varchar(120)")
      .addColumn("product_type_name", "varchar(180)")
      .addColumn("unit_id", "varchar(120)")
      .addColumn("hsn_code_id", "varchar(120)")
      .addColumn("style_id", "varchar(120)")
      .addColumn("sku", "varchar(120)", (column) => column.notNull())
      .addColumn("has_variants", "boolean", (column) => column.notNull().defaultTo(false))
      .addColumn("base_price", sql`double`, (column) => column.notNull().defaultTo(0))
      .addColumn("cost_price", sql`double`, (column) => column.notNull().defaultTo(0))
      .addColumn("tax_id", "varchar(120)")
      .addColumn("is_featured", "boolean", (column) => column.notNull().defaultTo(false))
      .addColumn("is_active", "boolean", (column) => column.notNull().defaultTo(true))
      .addColumn("storefront_department", "varchar(80)")
      .addColumn("home_slider_enabled", "boolean", (column) => column.notNull().defaultTo(false))
      .addColumn("promo_slider_enabled", "boolean", (column) => column.notNull().defaultTo(false))
      .addColumn("feature_section_enabled", "boolean", (column) =>
        column.notNull().defaultTo(false),
      )
      .addColumn("discovery_board_enabled", "boolean", (column) =>
        column.notNull().defaultTo(false),
      )
      .addColumn("discovery_board_order", "integer", (column) => column.notNull().defaultTo(0))
      .addColumn("visual_strip_enabled", "boolean", (column) => column.notNull().defaultTo(false))
      .addColumn("visual_strip_order", "integer", (column) => column.notNull().defaultTo(0))
      .addColumn("is_new_arrival", "boolean", (column) => column.notNull().defaultTo(false))
      .addColumn("is_best_seller", "boolean", (column) => column.notNull().defaultTo(false))
      .addColumn("is_featured_label", "boolean", (column) => column.notNull().defaultTo(false))
      .addColumn("primary_image_url", "varchar(500)")
      .addColumn("variant_count", "integer", (column) => column.notNull().defaultTo(0))
      .addColumn("attribute_count", "integer", (column) => column.notNull().defaultTo(0))
      .addColumn("total_stock_quantity", sql`double`, (column) => column.notNull().defaultTo(0))
      .addColumn("tag_count", "integer", (column) => column.notNull().defaultTo(0))
      .addColumn("tag_names_json", sql`json`, (column) => column.notNull())
      .addColumn("images_json", sql`json`, (column) => column.notNull())
      .addColumn("variants_json", sql`json`, (column) => column.notNull())
      .addColumn("prices_json", sql`json`, (column) => column.notNull())
      .addColumn("discounts_json", sql`json`, (column) => column.notNull())
      .addColumn("offers_json", sql`json`, (column) => column.notNull())
      .addColumn("attributes_json", sql`json`, (column) => column.notNull())
      .addColumn("attribute_values_json", sql`json`, (column) => column.notNull())
      .addColumn("variant_map_json", sql`json`, (column) => column.notNull())
      .addColumn("stock_items_json", sql`json`, (column) => column.notNull())
      .addColumn("stock_movements_json", sql`json`, (column) => column.notNull())
      .addColumn("seo_json", sql`json`, (column) => column.notNull())
      .addColumn("storefront_json", sql`json`, (column) => column.notNull())
      .addColumn("tags_json", sql`json`, (column) => column.notNull())
      .addColumn("reviews_json", sql`json`, (column) => column.notNull())
      .addColumn("created_at", "datetime", (column) =>
        column.notNull().defaultTo(sql`CURRENT_TIMESTAMP`),
      )
      .addColumn("updated_at", "datetime", (column) =>
        column.notNull().defaultTo(sql`CURRENT_TIMESTAMP`),
      )
      .addColumn("deleted_at", "datetime")
      .execute();

    await queryDatabase.schema
      .createIndex("uq_products_code")
      .ifNotExists()
      .on("products")
      .column("code")
      .unique()
      .execute();

    await queryDatabase.schema
      .createIndex("uq_products_sku")
      .ifNotExists()
      .on("products")
      .column("sku")
      .unique()
      .execute();

    await queryDatabase.schema
      .createIndex("uq_products_slug")
      .ifNotExists()
      .on("products")
      .column("slug")
      .unique()
      .execute();
  },
});
