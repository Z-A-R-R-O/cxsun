import { sql, type Kysely } from 'kysely'

type DynamicDatabase = Record<string, Record<string, unknown>>

export async function migrateEcommerceTables(database: Kysely<DynamicDatabase>) {
  await sql.raw(`
    CREATE TABLE IF NOT EXISTS ecommerce_store_settings (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      uuid CHAR(8) NOT NULL UNIQUE,
      tenant_id INT NOT NULL,
      store_name VARCHAR(191) NOT NULL,
      store_status VARCHAR(40) NOT NULL DEFAULT 'draft',
      default_currency_id INT NULL,
      default_tax_mode VARCHAR(40) NOT NULL DEFAULT 'exclusive',
      order_prefix VARCHAR(40) NOT NULL DEFAULT 'EC',
      public_contact_email VARCHAR(191) NULL,
      public_contact_phone VARCHAR(80) NULL,
      return_policy TEXT NULL,
      shipping_policy TEXT NULL,
      privacy_policy TEXT NULL,
      terms TEXT NULL,
      settings_json JSON NULL,
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      deleted_at DATETIME NULL,
      UNIQUE KEY uq_ecommerce_store_tenant (tenant_id)
    )
  `).execute(database)

  await sql.raw(`
    CREATE TABLE IF NOT EXISTS ecommerce_product_publications (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      uuid CHAR(8) NOT NULL UNIQUE,
      tenant_id INT NOT NULL,
      product_id INT NOT NULL,
      category_id INT NULL,
      slug VARCHAR(220) NOT NULL,
      title VARCHAR(240) NOT NULL,
      subtitle VARCHAR(240) NULL,
      short_description TEXT NULL,
      description TEXT NULL,
      seo_title VARCHAR(240) NULL,
      seo_description TEXT NULL,
      status VARCHAR(40) NOT NULL DEFAULT 'draft',
      visibility VARCHAR(40) NOT NULL DEFAULT 'public',
      sale_price DOUBLE NOT NULL DEFAULT 0,
      compare_at_price DOUBLE NOT NULL DEFAULT 0,
      stock_status VARCHAR(40) NOT NULL DEFAULT 'in_stock',
      published_at DATETIME NULL,
      available_from DATETIME NULL,
      available_to DATETIME NULL,
      sort_order INT NOT NULL DEFAULT 0,
      is_featured TINYINT(1) NOT NULL DEFAULT 0,
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      deleted_at DATETIME NULL,
      UNIQUE KEY uq_ecommerce_product_slug (tenant_id, slug),
      UNIQUE KEY uq_ecommerce_product_source (tenant_id, product_id),
      INDEX idx_ecommerce_products_status (tenant_id, status, visibility, is_active)
    )
  `).execute(database)

  await sql.raw(`
    CREATE TABLE IF NOT EXISTS ecommerce_customer_profiles (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      uuid CHAR(8) NOT NULL UNIQUE,
      tenant_id INT NOT NULL,
      contact_id INT NOT NULL,
      customer_no VARCHAR(80) NOT NULL,
      portal_status VARCHAR(40) NOT NULL DEFAULT 'invited',
      portal_account_id INT NULL,
      login_email VARCHAR(191) NULL,
      login_phone VARCHAR(80) NULL,
      default_billing_address_id INT NULL,
      default_shipping_address_id INT NULL,
      marketing_opt_in TINYINT(1) NOT NULL DEFAULT 0,
      notes TEXT NULL,
      settings_json JSON NULL,
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      deleted_at DATETIME NULL,
      UNIQUE KEY uq_ecommerce_customer_source (tenant_id, contact_id),
      UNIQUE KEY uq_ecommerce_customer_no (tenant_id, customer_no),
      INDEX idx_ecommerce_customers_status (tenant_id, portal_status, is_active)
    )
  `).execute(database)

  await sql.raw(`
    CREATE TABLE IF NOT EXISTS ecommerce_customer_portal_accounts (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      uuid CHAR(8) NOT NULL UNIQUE,
      tenant_id INT NOT NULL,
      customer_profile_id INT NOT NULL,
      contact_id INT NOT NULL,
      email VARCHAR(191) NULL,
      phone VARCHAR(80) NULL,
      password_hash VARCHAR(240) NULL,
      status VARCHAR(40) NOT NULL DEFAULT 'invited',
      email_verified_at DATETIME NULL,
      phone_verified_at DATETIME NULL,
      last_login_at DATETIME NULL,
      last_login_ip VARCHAR(80) NULL,
      failed_login_count INT NOT NULL DEFAULT 0,
      reset_token_hash VARCHAR(240) NULL,
      reset_token_expires_at DATETIME NULL,
      settings_json JSON NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      deleted_at DATETIME NULL,
      INDEX idx_ecommerce_portal_accounts_customer (tenant_id, customer_profile_id, status)
    )
  `).execute(database)

  await sql.raw(`
    CREATE TABLE IF NOT EXISTS ecommerce_carts (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      uuid CHAR(8) NOT NULL UNIQUE,
      tenant_id INT NOT NULL,
      customer_profile_id INT NULL,
      contact_id INT NULL,
      session_key VARCHAR(180) NULL,
      status VARCHAR(40) NOT NULL DEFAULT 'active',
      currency_id INT NULL,
      subtotal DOUBLE NOT NULL DEFAULT 0,
      discount_total DOUBLE NOT NULL DEFAULT 0,
      tax_total DOUBLE NOT NULL DEFAULT 0,
      shipping_total DOUBLE NOT NULL DEFAULT 0,
      grand_total DOUBLE NOT NULL DEFAULT 0,
      expires_at DATETIME NULL,
      metadata_json JSON NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      deleted_at DATETIME NULL,
      INDEX idx_ecommerce_carts_status (tenant_id, status, updated_at)
    )
  `).execute(database)

  await sql.raw(`
    CREATE TABLE IF NOT EXISTS ecommerce_orders (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      uuid CHAR(8) NOT NULL UNIQUE,
      tenant_id INT NOT NULL,
      order_no VARCHAR(80) NOT NULL,
      contact_id INT NULL,
      customer_profile_id INT NULL,
      cart_id INT NULL,
      checkout_session_id INT NULL,
      status VARCHAR(40) NOT NULL DEFAULT 'placed',
      payment_status VARCHAR(40) NOT NULL DEFAULT 'pending',
      fulfillment_status VARCHAR(40) NOT NULL DEFAULT 'unfulfilled',
      currency_id INT NULL,
      subtotal DOUBLE NOT NULL DEFAULT 0,
      discount_total DOUBLE NOT NULL DEFAULT 0,
      tax_total DOUBLE NOT NULL DEFAULT 0,
      shipping_total DOUBLE NOT NULL DEFAULT 0,
      round_off DOUBLE NOT NULL DEFAULT 0,
      grand_total DOUBLE NOT NULL DEFAULT 0,
      billing_address_json JSON NULL,
      shipping_address_json JSON NULL,
      customer_snapshot_json JSON NULL,
      source VARCHAR(40) NOT NULL DEFAULT 'storefront',
      sales_entry_uuid VARCHAR(80) NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      deleted_at DATETIME NULL,
      UNIQUE KEY uq_ecommerce_order_no (tenant_id, order_no),
      INDEX idx_ecommerce_orders_status (tenant_id, status, payment_status, fulfillment_status)
    )
  `).execute(database)

  await sql.raw(`
    CREATE TABLE IF NOT EXISTS ecommerce_shipments (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      uuid CHAR(8) NOT NULL UNIQUE,
      tenant_id INT NOT NULL,
      order_id INT NOT NULL,
      shipment_no VARCHAR(80) NOT NULL,
      carrier VARCHAR(120) NULL,
      tracking_no VARCHAR(160) NULL,
      status VARCHAR(40) NOT NULL DEFAULT 'pending',
      shipped_at DATETIME NULL,
      delivered_at DATETIME NULL,
      shipping_address_json JSON NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      deleted_at DATETIME NULL,
      INDEX idx_ecommerce_shipments_order (tenant_id, order_id, status)
    )
  `).execute(database)

  await sql.raw(`
    CREATE TABLE IF NOT EXISTS ecommerce_returns (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      uuid CHAR(8) NOT NULL UNIQUE,
      tenant_id INT NOT NULL,
      order_id INT NOT NULL,
      return_no VARCHAR(80) NOT NULL,
      status VARCHAR(40) NOT NULL DEFAULT 'requested',
      reason TEXT NULL,
      refund_amount DOUBLE NOT NULL DEFAULT 0,
      requested_at DATETIME NULL,
      closed_at DATETIME NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      deleted_at DATETIME NULL,
      INDEX idx_ecommerce_returns_status (tenant_id, status, requested_at)
    )
  `).execute(database)

  await sql.raw(`
    CREATE TABLE IF NOT EXISTS ecommerce_coupons (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      uuid CHAR(8) NOT NULL UNIQUE,
      tenant_id INT NOT NULL,
      code VARCHAR(80) NOT NULL,
      name VARCHAR(180) NOT NULL,
      discount_type VARCHAR(40) NOT NULL DEFAULT 'percentage',
      discount_value DOUBLE NOT NULL DEFAULT 0,
      min_order_value DOUBLE NOT NULL DEFAULT 0,
      max_discount_value DOUBLE NOT NULL DEFAULT 0,
      usage_limit INT NULL,
      used_count INT NOT NULL DEFAULT 0,
      starts_at DATETIME NULL,
      ends_at DATETIME NULL,
      status VARCHAR(40) NOT NULL DEFAULT 'draft',
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      deleted_at DATETIME NULL,
      UNIQUE KEY uq_ecommerce_coupon_code (tenant_id, code)
    )
  `).execute(database)

  await sql.raw(`
    CREATE TABLE IF NOT EXISTS ecommerce_reviews (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      uuid CHAR(8) NOT NULL UNIQUE,
      tenant_id INT NOT NULL,
      publication_id INT NOT NULL,
      product_id INT NOT NULL,
      customer_profile_id INT NULL,
      order_item_id INT NULL,
      rating INT NOT NULL DEFAULT 0,
      title VARCHAR(180) NULL,
      body TEXT NULL,
      status VARCHAR(40) NOT NULL DEFAULT 'pending',
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      deleted_at DATETIME NULL,
      INDEX idx_ecommerce_reviews_status (tenant_id, status, publication_id)
    )
  `).execute(database)

  await sql.raw(`
    CREATE TABLE IF NOT EXISTS ecommerce_wishlists (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      uuid CHAR(8) NOT NULL UNIQUE,
      tenant_id INT NOT NULL,
      customer_profile_id INT NOT NULL,
      name VARCHAR(180) NOT NULL DEFAULT 'Default',
      is_default TINYINT(1) NOT NULL DEFAULT 1,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      deleted_at DATETIME NULL,
      INDEX idx_ecommerce_wishlists_customer (tenant_id, customer_profile_id)
    )
  `).execute(database)
}
