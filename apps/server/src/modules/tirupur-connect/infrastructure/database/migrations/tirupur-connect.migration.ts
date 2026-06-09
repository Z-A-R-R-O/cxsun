import { sql, type Kysely } from 'kysely'
import type { TenantDatabaseSchema } from '../../../../../infrastructure/tenant-database/tenant-database.schema.js'
import type { Tenant } from '../../../../../core/tenant/domain/tenant.types.js'

type TenantDatabase = Kysely<TenantDatabaseSchema>

export const tirupurConnectTenantSlug = 'tirupur_connect'

export async function migrateTirupurConnectTables(database: TenantDatabase, tenant?: Tenant) {
  await sql.raw(`
    CREATE TABLE IF NOT EXISTS tc_system_settings (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      uuid CHAR(8) NOT NULL UNIQUE,
      tenant_id INT NOT NULL,
      company_id INT NULL,
      setting_key VARCHAR(120) NOT NULL,
      setting_value JSON NULL,
      created_by INT NULL,
      updated_by INT NULL,
      deleted_by INT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      deleted_at TIMESTAMP NULL,
      UNIQUE KEY uq_tc_system_settings_key (tenant_id, company_id, setting_key)
    )
  `).execute(database)

  await migrateTirupurConnectSourceTables(database)

  if (tenant?.slug !== tirupurConnectTenantSlug) {
    await dropTirupurConnectMarketplaceTables(database)
    return
  }

  await sql.raw(`
    CREATE TABLE IF NOT EXISTS tc_activity_logs (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      uuid CHAR(8) NOT NULL UNIQUE,
      tenant_id INT NOT NULL,
      company_id INT NULL,
      entity_type VARCHAR(120) NOT NULL,
      entity_id INT NULL,
      action VARCHAR(120) NOT NULL,
      message VARCHAR(255) NULL,
      metadata JSON NULL,
      created_by INT NULL,
      updated_by INT NULL,
      deleted_by INT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      deleted_at TIMESTAMP NULL,
      INDEX idx_tc_activity_logs_entity (tenant_id, entity_type, entity_id)
    )
  `).execute(database)

  await sql.raw(`
    CREATE TABLE IF NOT EXISTS tc_audit_history (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      uuid CHAR(8) NOT NULL UNIQUE,
      tenant_id INT NOT NULL,
      company_id INT NULL,
      entity_type VARCHAR(120) NOT NULL,
      entity_id INT NOT NULL,
      action VARCHAR(120) NOT NULL,
      field_changes JSON NULL,
      metadata JSON NULL,
      created_by INT NULL,
      updated_by INT NULL,
      deleted_by INT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      deleted_at TIMESTAMP NULL,
      INDEX idx_tc_audit_history_entity (tenant_id, entity_type, entity_id)
    )
  `).execute(database)

  await sql.raw(`
    CREATE TABLE IF NOT EXISTS tc_membership_plans (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      uuid CHAR(8) NOT NULL UNIQUE,
      tenant_id INT NOT NULL,
      company_id INT NULL,
      currency_id INT NULL,
      name VARCHAR(191) NOT NULL,
      slug VARCHAR(191) NOT NULL,
      price DOUBLE NOT NULL DEFAULT 0,
      duration_months INT NOT NULL DEFAULT 12,
      features JSON NULL,
      max_products INT NULL,
      max_rfq_responses INT NULL,
      priority_listing TINYINT(1) NOT NULL DEFAULT 0,
      featured TINYINT(1) NOT NULL DEFAULT 0,
      verified_badge TINYINT(1) NOT NULL DEFAULT 0,
      analytics_access TINYINT(1) NOT NULL DEFAULT 0,
      sort_order INT NOT NULL DEFAULT 1,
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      created_by INT NULL,
      updated_by INT NULL,
      deleted_by INT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      deleted_at TIMESTAMP NULL,
      UNIQUE KEY uq_tc_membership_plans_slug (tenant_id, slug)
    )
  `).execute(database)

  await sql.raw(`
    CREATE TABLE IF NOT EXISTS tc_supplier_profiles (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      uuid CHAR(8) NOT NULL UNIQUE,
      tenant_id INT NOT NULL,
      company_id INT NULL,
      contact_id INT NOT NULL,
      country_id INT NULL,
      state_id INT NULL,
      city_id INT NULL,
      pincode_id INT NULL,
      membership_plan_id INT NULL,
      brand_name VARCHAR(255) NULL,
      logo_url VARCHAR(500) NULL,
      cover_image_url VARCHAR(500) NULL,
      about TEXT NULL,
      year_established INT NULL,
      business_type VARCHAR(120) NULL,
      iec_number VARCHAR(120) NULL,
      factory_address TEXT NULL,
      designation VARCHAR(120) NULL,
      employee_count INT NULL,
      factory_size VARCHAR(120) NULL,
      monthly_capacity VARCHAR(120) NULL,
      annual_turnover VARCHAR(120) NULL,
      min_order_qty INT NULL,
      lead_time VARCHAR(120) NULL,
      social_media JSON NULL,
      verification_level VARCHAR(80) NOT NULL DEFAULT 'none',
      status VARCHAR(80) NOT NULL DEFAULT 'draft',
      created_by INT NULL,
      updated_by INT NULL,
      deleted_by INT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      deleted_at TIMESTAMP NULL,
      INDEX idx_tc_supplier_profiles_contact (tenant_id, contact_id),
      INDEX idx_tc_supplier_profiles_status (tenant_id, status)
    )
  `).execute(database)

  await sql.raw(`
    CREATE TABLE IF NOT EXISTS tc_certifications (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      uuid CHAR(8) NOT NULL UNIQUE,
      tenant_id INT NOT NULL,
      company_id INT NULL,
      name VARCHAR(191) NOT NULL,
      issuing_body VARCHAR(191) NULL,
      description TEXT NULL,
      icon_url VARCHAR(500) NULL,
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      created_by INT NULL,
      updated_by INT NULL,
      deleted_by INT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      deleted_at TIMESTAMP NULL
    )
  `).execute(database)

  await sql.raw(`
    CREATE TABLE IF NOT EXISTS tc_product_categories (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      uuid CHAR(8) NOT NULL UNIQUE,
      tenant_id INT NOT NULL,
      company_id INT NULL,
      parent_id INT NULL,
      name VARCHAR(191) NOT NULL,
      slug VARCHAR(191) NOT NULL,
      icon_url VARCHAR(500) NULL,
      sort_order INT NOT NULL DEFAULT 1,
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      created_by INT NULL,
      updated_by INT NULL,
      deleted_by INT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      deleted_at TIMESTAMP NULL,
      UNIQUE KEY uq_tc_product_categories_slug (tenant_id, slug)
    )
  `).execute(database)

  await sql.raw(`
    CREATE TABLE IF NOT EXISTS tc_buyer_companies (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      uuid CHAR(8) NOT NULL UNIQUE,
      tenant_id INT NOT NULL,
      company_id INT NULL,
      contact_id INT NOT NULL,
      country_id INT NULL,
      buyer_type VARCHAR(120) NULL,
      annual_volume VARCHAR(120) NULL,
      description TEXT NULL,
      status VARCHAR(80) NOT NULL DEFAULT 'draft',
      created_by INT NULL,
      updated_by INT NULL,
      deleted_by INT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      deleted_at TIMESTAMP NULL,
      INDEX idx_tc_buyer_companies_contact (tenant_id, contact_id)
    )
  `).execute(database)

  await sql.raw(`
    CREATE TABLE IF NOT EXISTS tc_products (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      uuid CHAR(8) NOT NULL UNIQUE,
      tenant_id INT NOT NULL,
      company_id INT NULL,
      product_id INT NOT NULL,
      supplier_profile_id INT NOT NULL,
      tc_category_id INT NULL,
      slug VARCHAR(191) NOT NULL,
      description TEXT NULL,
      moq INT NULL,
      lead_time VARCHAR(120) NULL,
      fabric_details TEXT NULL,
      certification_details TEXT NULL,
      status VARCHAR(80) NOT NULL DEFAULT 'draft',
      created_by INT NULL,
      updated_by INT NULL,
      deleted_by INT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      deleted_at TIMESTAMP NULL,
      UNIQUE KEY uq_tc_products_slug (tenant_id, slug),
      INDEX idx_tc_products_supplier (tenant_id, supplier_profile_id)
    )
  `).execute(database)

  await sql.raw(`
    CREATE TABLE IF NOT EXISTS tc_rfq (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      uuid CHAR(8) NOT NULL UNIQUE,
      tenant_id INT NOT NULL,
      company_id INT NULL,
      buyer_company_id INT NOT NULL,
      tc_category_id INT NULL,
      unit_id INT NULL,
      delivery_country_id INT NULL,
      budget_currency_id INT NULL,
      title VARCHAR(191) NOT NULL,
      description TEXT NULL,
      quantity DOUBLE NOT NULL DEFAULT 0,
      delivery_deadline DATE NULL,
      certifications_required JSON NULL,
      budget_min DOUBLE NULL,
      budget_max DOUBLE NULL,
      status VARCHAR(80) NOT NULL DEFAULT 'open',
      created_by INT NULL,
      updated_by INT NULL,
      deleted_by INT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      deleted_at TIMESTAMP NULL,
      INDEX idx_tc_rfq_status (tenant_id, status)
    )
  `).execute(database)

  await migrateTirupurConnectPublicationTables(database)
  await migrateTirupurConnectChildTables(database)
  await seedTirupurConnectMarketplaceDefaults(database, Number(tenant.id))
}

async function migrateTirupurConnectSourceTables(database: TenantDatabase) {
  await sql.raw(`
    CREATE TABLE IF NOT EXISTS tc_supplier_profiles (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      uuid CHAR(8) NOT NULL UNIQUE,
      tenant_id INT NOT NULL,
      company_id INT NULL,
      contact_id INT NOT NULL,
      country_id INT NULL,
      state_id INT NULL,
      city_id INT NULL,
      pincode_id INT NULL,
      membership_plan_id INT NULL,
      brand_name VARCHAR(255) NULL,
      logo_url VARCHAR(500) NULL,
      cover_image_url VARCHAR(500) NULL,
      about TEXT NULL,
      year_established INT NULL,
      business_type VARCHAR(120) NULL,
      iec_number VARCHAR(120) NULL,
      factory_address TEXT NULL,
      designation VARCHAR(120) NULL,
      employee_count INT NULL,
      factory_size VARCHAR(120) NULL,
      monthly_capacity VARCHAR(120) NULL,
      annual_turnover VARCHAR(120) NULL,
      min_order_qty INT NULL,
      lead_time VARCHAR(120) NULL,
      social_media JSON NULL,
      verification_level VARCHAR(80) NOT NULL DEFAULT 'none',
      status VARCHAR(80) NOT NULL DEFAULT 'draft',
      publication_status VARCHAR(80) NOT NULL DEFAULT 'draft',
      published_at DATETIME NULL,
      central_publication_uuid CHAR(8) NULL,
      created_by INT NULL,
      updated_by INT NULL,
      deleted_by INT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      deleted_at TIMESTAMP NULL,
      INDEX idx_tc_supplier_profiles_contact (tenant_id, contact_id),
      INDEX idx_tc_supplier_profiles_status (tenant_id, status)
    )
  `).execute(database)

  await sql.raw(`ALTER TABLE tc_supplier_profiles ADD COLUMN IF NOT EXISTS publication_status VARCHAR(80) NOT NULL DEFAULT 'draft'`).execute(database)
  await sql.raw(`ALTER TABLE tc_supplier_profiles ADD COLUMN IF NOT EXISTS published_at DATETIME NULL`).execute(database)
  await sql.raw(`ALTER TABLE tc_supplier_profiles ADD COLUMN IF NOT EXISTS central_publication_uuid CHAR(8) NULL`).execute(database)

  await sql.raw(`
    CREATE TABLE IF NOT EXISTS tc_products (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      uuid CHAR(8) NOT NULL UNIQUE,
      tenant_id INT NOT NULL,
      company_id INT NULL,
      product_id INT NOT NULL,
      supplier_profile_id INT NOT NULL,
      tc_category_id INT NULL,
      slug VARCHAR(191) NOT NULL,
      description TEXT NULL,
      moq INT NULL,
      lead_time VARCHAR(120) NULL,
      fabric_details TEXT NULL,
      certification_details TEXT NULL,
      status VARCHAR(80) NOT NULL DEFAULT 'draft',
      publication_status VARCHAR(80) NOT NULL DEFAULT 'draft',
      published_at DATETIME NULL,
      central_publication_uuid CHAR(8) NULL,
      created_by INT NULL,
      updated_by INT NULL,
      deleted_by INT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      deleted_at TIMESTAMP NULL,
      UNIQUE KEY uq_tc_products_slug (tenant_id, slug),
      INDEX idx_tc_products_supplier (tenant_id, supplier_profile_id)
    )
  `).execute(database)

  await sql.raw(`ALTER TABLE tc_products ADD COLUMN IF NOT EXISTS publication_status VARCHAR(80) NOT NULL DEFAULT 'draft'`).execute(database)
  await sql.raw(`ALTER TABLE tc_products ADD COLUMN IF NOT EXISTS published_at DATETIME NULL`).execute(database)
  await sql.raw(`ALTER TABLE tc_products ADD COLUMN IF NOT EXISTS central_publication_uuid CHAR(8) NULL`).execute(database)
}

async function migrateTirupurConnectChildTables(database: TenantDatabase) {
  const definitions = [
    { table: 'tc_supplier_export_countries', columns: `supplier_profile_id INT NOT NULL, country_id INT NOT NULL` },
    { table: 'tc_supplier_certifications', columns: `supplier_profile_id INT NOT NULL, certification_id INT NOT NULL, certificate_number VARCHAR(120) NULL, issued_date DATE NULL, expiry_date DATE NULL, document_url VARCHAR(500) NULL, status VARCHAR(80) NOT NULL DEFAULT 'pending'` },
    { table: 'tc_documents', columns: `entity_type VARCHAR(120) NOT NULL, entity_id INT NOT NULL, document_type VARCHAR(120) NOT NULL, file_name VARCHAR(255) NOT NULL, file_url VARCHAR(500) NOT NULL, file_size INT NULL, mime_type VARCHAR(120) NULL` },
    { table: 'tc_buyer_import_categories', columns: `buyer_company_id INT NOT NULL, category_id INT NOT NULL` },
    { table: 'tc_buyer_target_products', columns: `buyer_company_id INT NOT NULL, product_id INT NOT NULL` },
    { table: 'tc_product_images', columns: `tc_product_id INT NOT NULL, image_url VARCHAR(500) NOT NULL, sort_order INT NOT NULL DEFAULT 1, is_primary TINYINT(1) NOT NULL DEFAULT 0` },
    { table: 'tc_product_colours', columns: `tc_product_id INT NOT NULL, colour_id INT NOT NULL` },
    { table: 'tc_product_sizes', columns: `tc_product_id INT NOT NULL, size_id INT NOT NULL` },
    { table: 'tc_rfq_responses', columns: `rfq_id INT NOT NULL, supplier_profile_id INT NOT NULL, currency_id INT NULL, price_per_unit DOUBLE NULL, total_amount DOUBLE NULL, lead_time VARCHAR(120) NULL, moq INT NULL, notes TEXT NULL, proposal_url VARCHAR(500) NULL, status VARCHAR(80) NOT NULL DEFAULT 'submitted'` },
    { table: 'tc_rfq_attachments', columns: `rfq_id INT NOT NULL, file_name VARCHAR(255) NOT NULL, file_url VARCHAR(500) NOT NULL, file_size INT NULL, mime_type VARCHAR(120) NULL` },
    { table: 'tc_memberships', columns: `supplier_profile_id INT NOT NULL, plan_id INT NOT NULL, start_date DATE NULL, end_date DATE NULL, status VARCHAR(80) NOT NULL DEFAULT 'active', payment_reference VARCHAR(191) NULL` },
    { table: 'tc_verifications', columns: `supplier_profile_id INT NOT NULL, level VARCHAR(80) NOT NULL, status VARCHAR(80) NOT NULL DEFAULT 'pending', reviewed_by INT NULL, reviewed_at DATETIME NULL, notes TEXT NULL, documents JSON NULL` },
    { table: 'tc_trade_leads', columns: `buyer_company_id INT NOT NULL, tc_category_id INT NULL, country_id INT NULL, title VARCHAR(191) NOT NULL, description TEXT NULL, quantity DOUBLE NULL, budget_range VARCHAR(120) NULL, status VARCHAR(80) NOT NULL DEFAULT 'open'` },
    { table: 'tc_inquiries', columns: `entity_type VARCHAR(80) NOT NULL, entity_uuid CHAR(8) NULL, source_tenant_slug VARCHAR(80) NULL, buyer_name VARCHAR(191) NOT NULL, company_name VARCHAR(191) NULL, email VARCHAR(191) NULL, phone VARCHAR(80) NULL, message TEXT NOT NULL, status VARCHAR(80) NOT NULL DEFAULT 'new'` },
    { table: 'tc_conversations', columns: `buyer_company_id INT NULL, supplier_profile_id INT NULL, subject VARCHAR(191) NULL, status VARCHAR(80) NOT NULL DEFAULT 'open'` },
    { table: 'tc_messages', columns: `conversation_id INT NOT NULL, sender_type VARCHAR(80) NOT NULL, sender_id INT NULL, body TEXT NOT NULL, read_at DATETIME NULL` },
    { table: 'tc_events', columns: `city_id INT NULL, title VARCHAR(191) NOT NULL, slug VARCHAR(191) NOT NULL, description TEXT NULL, starts_at DATETIME NULL, ends_at DATETIME NULL, venue VARCHAR(191) NULL, status VARCHAR(80) NOT NULL DEFAULT 'draft'` },
    { table: 'tc_event_registrations', columns: `event_id INT NOT NULL, contact_id INT NULL, name VARCHAR(191) NOT NULL, email VARCHAR(191) NULL, phone VARCHAR(80) NULL, status VARCHAR(80) NOT NULL DEFAULT 'registered'` },
    { table: 'tc_news_articles', columns: `category VARCHAR(120) NULL, title VARCHAR(191) NOT NULL, slug VARCHAR(191) NOT NULL, excerpt TEXT NULL, body TEXT NULL, status VARCHAR(80) NOT NULL DEFAULT 'draft', published_at DATETIME NULL` },
    { table: 'tc_notifications', columns: `recipient_type VARCHAR(80) NOT NULL, recipient_id INT NULL, title VARCHAR(191) NOT NULL, body TEXT NULL, read_at DATETIME NULL, metadata JSON NULL` },
    { table: 'tc_saved_searches', columns: `owner_type VARCHAR(80) NOT NULL, owner_id INT NULL, name VARCHAR(191) NOT NULL, filters JSON NULL` },
  ]

  for (const definition of definitions) {
    await sql.raw(`
      CREATE TABLE IF NOT EXISTS ${definition.table} (
        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        uuid CHAR(8) NOT NULL UNIQUE,
        tenant_id INT NOT NULL,
        company_id INT NULL,
        ${definition.columns},
        created_by INT NULL,
        updated_by INT NULL,
        deleted_by INT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP NULL
      )
    `).execute(database)
  }
}

async function migrateTirupurConnectPublicationTables(database: TenantDatabase) {
  await sql.raw(`
    CREATE TABLE IF NOT EXISTS tc_supplier_publications (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      uuid CHAR(8) NOT NULL UNIQUE,
      tenant_id INT NOT NULL,
      company_id INT NULL,
      source_tenant_id INT NOT NULL,
      source_tenant_slug VARCHAR(80) NOT NULL,
      source_supplier_uuid CHAR(8) NOT NULL,
      source_contact_id INT NOT NULL,
      brand_name VARCHAR(255) NULL,
      business_type VARCHAR(120) NULL,
      about TEXT NULL,
      factory_address TEXT NULL,
      monthly_capacity VARCHAR(120) NULL,
      min_order_qty INT NULL,
      verification_level VARCHAR(80) NOT NULL DEFAULT 'none',
      publication_status VARCHAR(80) NOT NULL DEFAULT 'pending_review',
      reviewed_by INT NULL,
      reviewed_at DATETIME NULL,
      created_by INT NULL,
      updated_by INT NULL,
      deleted_by INT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      deleted_at TIMESTAMP NULL,
      UNIQUE KEY uq_tc_supplier_publications_source (source_tenant_id, source_supplier_uuid),
      INDEX idx_tc_supplier_publications_status (tenant_id, publication_status)
    )
  `).execute(database)

  await sql.raw(`
    CREATE TABLE IF NOT EXISTS tc_product_publications (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      uuid CHAR(8) NOT NULL UNIQUE,
      tenant_id INT NOT NULL,
      company_id INT NULL,
      source_tenant_id INT NOT NULL,
      source_tenant_slug VARCHAR(80) NOT NULL,
      source_product_uuid CHAR(8) NOT NULL,
      source_product_id INT NOT NULL,
      source_supplier_uuid CHAR(8) NULL,
      source_supplier_profile_id INT NOT NULL,
      slug VARCHAR(191) NOT NULL,
      description TEXT NULL,
      moq INT NULL,
      lead_time VARCHAR(120) NULL,
      fabric_details TEXT NULL,
      certification_details TEXT NULL,
      publication_status VARCHAR(80) NOT NULL DEFAULT 'pending_review',
      reviewed_by INT NULL,
      reviewed_at DATETIME NULL,
      created_by INT NULL,
      updated_by INT NULL,
      deleted_by INT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      deleted_at TIMESTAMP NULL,
      UNIQUE KEY uq_tc_product_publications_source (source_tenant_id, source_product_uuid),
      UNIQUE KEY uq_tc_product_publications_slug (tenant_id, source_tenant_slug, slug),
      INDEX idx_tc_product_publications_status (tenant_id, publication_status)
    )
  `).execute(database)
}

async function dropTirupurConnectMarketplaceTables(database: TenantDatabase) {
  const marketplaceTables = [
    'tc_saved_searches',
    'tc_notifications',
    'tc_news_articles',
    'tc_event_registrations',
    'tc_events',
    'tc_messages',
    'tc_conversations',
    'tc_trade_leads',
    'tc_verifications',
    'tc_memberships',
    'tc_rfq_attachments',
    'tc_rfq_responses',
    'tc_product_sizes',
    'tc_product_colours',
    'tc_product_images',
    'tc_buyer_target_products',
    'tc_buyer_import_categories',
    'tc_documents',
    'tc_supplier_certifications',
    'tc_supplier_export_countries',
    'tc_rfq',
    'tc_buyer_companies',
    'tc_product_categories',
    'tc_certifications',
    'tc_membership_plans',
    'tc_audit_history',
    'tc_activity_logs',
    'tc_supplier_publications',
    'tc_product_publications',
  ]

  for (const table of marketplaceTables) {
    await sql.raw(`DROP TABLE IF EXISTS ${table}`).execute(database)
  }
}

async function seedTirupurConnectMarketplaceDefaults(database: TenantDatabase, tenantId: number) {
  await seedCategory(database, tenantId, 't-shirts', 'T-Shirts', 1)
  await seedCategory(database, tenantId, 'polo-shirts', 'Polo Shirts', 2)
  await seedCategory(database, tenantId, 'hoodies', 'Hoodies', 3)
  await seedCategory(database, tenantId, 'kids-wear', 'Kids Wear', 4)
  await seedCategory(database, tenantId, 'innerwear', 'Innerwear', 5)

  await seedPlan(database, tenantId, 'basic', 'Basic Listing', 0, 25, 5, 1)
  await seedPlan(database, tenantId, 'verified', 'Verified Supplier', 4999, 100, 25, 2)
  await seedPlan(database, tenantId, 'premium', 'Premium Export Partner', 14999, 500, 100, 3)

  await sql.raw(`
    INSERT INTO tc_system_settings (uuid, tenant_id, company_id, setting_key, setting_value, created_by, updated_by)
    SELECT LEFT(REPLACE(UUID(), '-', ''), 8), ${tenantId}, NULL, 'marketplace-concepts',
      JSON_OBJECT(
        'pages', JSON_ARRAY('Manufacturers', 'Products', 'RFQs', 'Events', 'News'),
        'boundary', 'Client tenants publish supplier/product profiles by API. RFQs, leads, messages, membership, and analytics are owned by the central Tirupur Connect tenant.'
      ),
      NULL, NULL
    WHERE NOT EXISTS (
      SELECT 1 FROM tc_system_settings
      WHERE tenant_id = ${tenantId}
        AND company_id IS NULL
        AND setting_key = 'marketplace-concepts'
        AND deleted_at IS NULL
    )
  `).execute(database)
}

async function seedCategory(database: TenantDatabase, tenantId: number, slug: string, name: string, sortOrder: number) {
  await sql`
    INSERT INTO tc_product_categories (uuid, tenant_id, company_id, name, slug, sort_order, is_active)
    SELECT LEFT(REPLACE(UUID(), '-', ''), 8), ${tenantId}, NULL, ${name}, ${slug}, ${sortOrder}, 1
    WHERE NOT EXISTS (
      SELECT 1 FROM tc_product_categories WHERE tenant_id = ${tenantId} AND slug = ${slug} AND deleted_at IS NULL
    )
  `.execute(database)
}

async function seedPlan(database: TenantDatabase, tenantId: number, slug: string, name: string, price: number, maxProducts: number, maxRfqResponses: number, sortOrder: number) {
  await sql`
    INSERT INTO tc_membership_plans (
      uuid, tenant_id, company_id, name, slug, price, duration_months, features, max_products, max_rfq_responses,
      priority_listing, featured, verified_badge, analytics_access, sort_order, is_active
    )
    SELECT LEFT(REPLACE(UUID(), '-', ''), 8), ${tenantId}, NULL, ${name}, ${slug}, ${price}, 12,
      JSON_ARRAY('Supplier profile', 'Product publication', 'RFQ visibility'),
      ${maxProducts}, ${maxRfqResponses}, ${sortOrder > 1 ? 1 : 0}, ${sortOrder > 2 ? 1 : 0}, ${sortOrder > 1 ? 1 : 0}, ${sortOrder > 1 ? 1 : 0}, ${sortOrder}, 1
    WHERE NOT EXISTS (
      SELECT 1 FROM tc_membership_plans WHERE tenant_id = ${tenantId} AND slug = ${slug} AND deleted_at IS NULL
    )
  `.execute(database)
}
