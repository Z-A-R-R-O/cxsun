# Ecommerce Module

## Purpose

Ecommerce is the tenant-owned standalone store app for CXSun. It should run public storefront, catalog publishing, cart, checkout, order capture, payment tracking, fulfillment, returns, customer account activity, marketing, and store reports from one module boundary.

The module must connect to the existing Contact and Product masters, but it must not change common tables or master tables for ecommerce-only needs. Ecommerce-specific data belongs in new ecommerce tables that reference existing master records by internal `id` and expose ecommerce-owned `uuid` values through APIs.

## Current Build State

Ecommerce is currently a scaffolded app surface, not a full backend module yet.

- `assist/README.md` and `assist/context/product-picture.md` describe CXSun as a multi-tenant commerce/business platform where storefront and tenant workspace are first-class surfaces.
- Live client scope already includes ecommerce tenants:
  - Tirupur Direct: Ecommerce + billing + inventory.
  - Deal O Deal: Ecommerce + billing + inventory.
- Tenant static content has an `ecommerce` industry/app scaffold for public storefront copy and a `shop` route prepared for catalog, cart, checkout, and order tracking.
- The frontend dashboard registers `ecommerce` as an active tenant app with menu groups for Storefront, Catalog, Customers, Fulfillment, Marketing, Reports, and Settings.
- Current ecommerce dashboard pages are mostly navigation entries. Only these routes are mapped to existing master/common data:
  - `app-ecommerce-categories` -> `productCategories`
  - `app-ecommerce-products` -> `products`
  - `app-ecommerce-customers` -> `contacts`
- There is no `apps/server/src/modules/ecommerce` implementation yet: no ecommerce migrations, service, repository, controller, or tenant provisioning call.
- Product master exists at `apps/server/src/modules/master/product` and stores tenant-local master records in `masters_products`.
- Contact master exists at `apps/server/src/modules/master/contact` and stores tenant-local master records in `masters_contacts`.
- Product category common data already includes storefront flags:
  - `show_on_storefront_top_menu`
  - `show_on_storefront_catalog`

## Standalone App Boundary

Create ecommerce as a standalone tenant module:

```text
apps/server/src/modules/ecommerce/
+-- Ecommerce.md
+-- domain/
|   +-- ecommerce-product-publication.ts
|   +-- ecommerce-customer-profile.ts
|   +-- ecommerce-cart.ts
|   +-- ecommerce-order.ts
|   +-- ecommerce-payment.ts
|   +-- ecommerce-fulfillment.ts
|   +-- events/
+-- application/
|   +-- dto/
|   +-- ecommerce-dashboard.service.ts
|   +-- ecommerce-catalog.service.ts
|   +-- ecommerce-cart.service.ts
|   +-- ecommerce-checkout.service.ts
|   +-- ecommerce-order.service.ts
|   +-- ecommerce-fulfillment.service.ts
|   +-- ecommerce-marketing.service.ts
|   +-- ecommerce-report.service.ts
+-- infrastructure/
|   +-- ecommerce.repository.ts
|   +-- database/
|       +-- migrations/
|       |   +-- ecommerce.migration.ts
|       +-- seeders/
+-- interface/
|   +-- http/
|       +-- ecommerce-admin-v1.controller.ts
|       +-- ecommerce-public-v1.controller.ts
+-- ecommerce.module.ts
+-- index.ts
```

Frontend standalone feature target:

```text
apps/frontend/src/features/ecommerce/
+-- ECOMMERCE.md
+-- ecommerce-page.tsx
+-- ecommerce-routes.ts
+-- application/
+-- components/
+-- domain/
+-- public-storefront/
```

The dashboard should route ecommerce pages to ecommerce-owned components instead of growing generic master-data behavior. Product, category, and customer pickers can reuse existing master APIs, but ecommerce views should own ecommerce-specific columns, actions, workflows, and state.

## Data Ownership Rules

Use existing masters as source records:

- Product source: `masters_products.id`
- Contact source: `masters_contacts.id`
- Category source: `common_product_categories.id`
- Other common product fields can be referenced when needed, such as brand, colour, size, unit, tax, HSN, style, and product type.

Do not add ecommerce-only fields to:

- `masters_products`
- `masters_contacts`
- `common_product_categories`
- other shared common/master tables

If ecommerce needs a new behavior, create a new ecommerce table with a foreign key to the shared record.

Every ecommerce-owned table must follow the repo identity rule:

```sql
id INT AUTO_INCREMENT PRIMARY KEY,
uuid CHAR(8) NOT NULL UNIQUE
```

Use `id` for internal joins. Use `uuid` in API payloads, URLs, frontend state, public order references, and customer-facing links.

## Proposed Tenant Tables

### Store Settings

`ecommerce_store_settings`

- `id`, `uuid`
- `store_name`
- `store_status`: draft, live, maintenance
- `default_currency_id`
- `default_tax_mode`: inclusive, exclusive
- `order_prefix`
- `public_contact_email`
- `public_contact_phone`
- `return_policy`
- `shipping_policy`
- `privacy_policy`
- `terms`
- `settings_json`
- `is_active`, `created_at`, `updated_at`, `deleted_at`

### Product Publication

`ecommerce_product_publications`

- `id`, `uuid`
- `product_id` -> `masters_products.id`
- `category_id` -> `common_product_categories.id`
- `slug`
- `title`
- `subtitle`
- `short_description`
- `description`
- `seo_title`
- `seo_description`
- `status`: draft, review, published, hidden, archived
- `visibility`: public, private, password, scheduled
- `published_at`
- `available_from`
- `available_to`
- `sort_order`
- `is_featured`
- `is_active`, `created_at`, `updated_at`, `deleted_at`

This table is the ecommerce extension of Product. Product master keeps business identity; publication keeps storefront behavior.

### Product Media

`ecommerce_product_media`

- `id`, `uuid`
- `publication_id` -> `ecommerce_product_publications.id`
- `media_id` -> media module asset id when available
- `url`
- `alt_text`
- `media_type`
- `sort_order`
- `is_primary`
- `is_active`, `created_at`, `updated_at`, `deleted_at`

### Product Pricing

`ecommerce_product_prices`

- `id`, `uuid`
- `publication_id` -> `ecommerce_product_publications.id`
- `price_type`: regular, sale, wholesale, member
- `currency_id`
- `mrp`
- `sale_price`
- `compare_at_price`
- `starts_at`
- `ends_at`
- `min_quantity`
- `is_active`, `created_at`, `updated_at`, `deleted_at`

### Collections

`ecommerce_collections`

- `id`, `uuid`
- `code`
- `name`
- `slug`
- `description`
- `banner_media_id`
- `status`
- `sort_order`
- `seo_title`
- `seo_description`
- `is_active`, `created_at`, `updated_at`, `deleted_at`

`ecommerce_collection_products`

- `id`, `uuid`
- `collection_id` -> `ecommerce_collections.id`
- `publication_id` -> `ecommerce_product_publications.id`
- `sort_order`
- `is_active`, `created_at`, `updated_at`, `deleted_at`

### Customer Profile

`ecommerce_customer_profiles`

- `id`, `uuid`
- `contact_id` -> `masters_contacts.id`
- `customer_no`
- `portal_status`: invited, active, blocked, closed
- `portal_account_id`, nullable future link to `ecommerce_customer_portal_accounts.id`
- `login_email`
- `login_phone`
- `default_billing_address_id`
- `default_shipping_address_id`
- `marketing_opt_in`
- `notes`
- `settings_json`
- `is_active`, `created_at`, `updated_at`, `deleted_at`

This table is the ecommerce extension of Contact. Contact master keeps the customer record; ecommerce profile keeps portal, consent, and storefront preferences.

### Customer Portal Account

`ecommerce_customer_portal_accounts`

- `id`, `uuid`
- `customer_profile_id` -> `ecommerce_customer_profiles.id`
- `contact_id` -> `masters_contacts.id`
- `email`
- `phone`
- `password_hash`
- `status`: invited, active, locked, disabled
- `email_verified_at`
- `phone_verified_at`
- `last_login_at`
- `last_login_ip`
- `failed_login_count`
- `reset_token_hash`
- `reset_token_expires_at`
- `settings_json`
- `created_at`, `updated_at`, `deleted_at`

This table owns ecommerce customer portal access. Do not store portal password, verification, login, or recovery fields in Contact master.

`ecommerce_customer_portal_sessions`

- `id`, `uuid`
- `portal_account_id` -> `ecommerce_customer_portal_accounts.id`
- `customer_profile_id` -> `ecommerce_customer_profiles.id`
- `session_token_hash`
- `device_label`
- `ip_address`
- `user_agent`
- `expires_at`
- `revoked_at`
- `created_at`, `updated_at`

Portal sessions are separate from tenant staff/admin sessions. A customer portal login must not unlock `/app/*`, `/admin/*`, or `/sa/*`.

### Customer Dashboard Snapshot

`ecommerce_customer_dashboard_preferences`

- `id`, `uuid`
- `customer_profile_id` -> `ecommerce_customer_profiles.id`
- `contact_id` -> `masters_contacts.id`
- `default_view`: orders, wishlist, profile, support
- `notification_settings_json`
- `recently_viewed_json`
- `saved_filters_json`
- `created_at`, `updated_at`, `deleted_at`

This table keeps customer-facing dashboard preferences outside Contact master.

### Customer Address

`ecommerce_customer_addresses`

- `id`, `uuid`
- `customer_profile_id` -> `ecommerce_customer_profiles.id`
- `contact_id` -> `masters_contacts.id`
- `address_type`: billing, shipping
- `name`
- `phone`
- `email`
- `address_line_1`
- `address_line_2`
- `city_id`
- `district_id`
- `state_id`
- `country_id`
- `pincode_id`
- `landmark`
- `is_default`
- `is_active`, `created_at`, `updated_at`, `deleted_at`

### Cart

`ecommerce_carts`

- `id`, `uuid`
- `customer_profile_id` -> `ecommerce_customer_profiles.id`, nullable for guest carts
- `contact_id` -> `masters_contacts.id`, nullable until checkout
- `session_key`
- `status`: active, abandoned, converted, expired
- `currency_id`
- `subtotal`
- `discount_total`
- `tax_total`
- `shipping_total`
- `grand_total`
- `expires_at`
- `metadata_json`
- `created_at`, `updated_at`, `deleted_at`

`ecommerce_cart_items`

- `id`, `uuid`
- `cart_id` -> `ecommerce_carts.id`
- `publication_id` -> `ecommerce_product_publications.id`
- `product_id` -> `masters_products.id`
- `sku_snapshot`
- `product_name_snapshot`
- `quantity`
- `unit_price`
- `discount_amount`
- `tax_amount`
- `line_total`
- `metadata_json`
- `created_at`, `updated_at`, `deleted_at`

### Checkout

`ecommerce_checkout_sessions`

- `id`, `uuid`
- `cart_id` -> `ecommerce_carts.id`
- `customer_profile_id` -> `ecommerce_customer_profiles.id`, nullable
- `status`: open, address, payment, confirmed, failed, expired
- `billing_address_json`
- `shipping_address_json`
- `shipping_method_id`
- `payment_method`
- `payment_gateway`
- `expires_at`
- `created_at`, `updated_at`, `deleted_at`

### Order

`ecommerce_orders`

- `id`, `uuid`
- `order_no`
- `contact_id` -> `masters_contacts.id`
- `customer_profile_id` -> `ecommerce_customer_profiles.id`, nullable
- `cart_id` -> `ecommerce_carts.id`, nullable
- `checkout_session_id` -> `ecommerce_checkout_sessions.id`, nullable
- `status`: placed, confirmed, packed, shipped, delivered, cancelled, returned
- `payment_status`: pending, authorized, paid, partially_refunded, refunded, failed
- `fulfillment_status`: unfulfilled, partial, fulfilled, returned
- `currency_id`
- `subtotal`
- `discount_total`
- `tax_total`
- `shipping_total`
- `round_off`
- `grand_total`
- `billing_address_json`
- `shipping_address_json`
- `customer_snapshot_json`
- `source`: storefront, admin, import, marketplace
- `sales_entry_uuid`, nullable future link to billing Sales
- `created_at`, `updated_at`, `deleted_at`

`ecommerce_order_items`

- `id`, `uuid`
- `order_id` -> `ecommerce_orders.id`
- `publication_id` -> `ecommerce_product_publications.id`, nullable
- `product_id` -> `masters_products.id`
- `sku_snapshot`
- `product_name_snapshot`
- `hsn_snapshot`
- `tax_snapshot_json`
- `quantity`
- `unit_price`
- `discount_amount`
- `tax_amount`
- `line_total`
- `created_at`, `updated_at`, `deleted_at`

Order records must keep snapshots so old orders stay readable even if Product or Contact master data changes later.

### Payment

`ecommerce_payments`

- `id`, `uuid`
- `order_id` -> `ecommerce_orders.id`
- `gateway`
- `gateway_order_id`
- `gateway_payment_id`
- `method`
- `status`: initiated, authorized, captured, failed, refunded
- `amount`
- `currency_id`
- `paid_at`
- `raw_payload_json`
- `created_at`, `updated_at`, `deleted_at`

### Fulfillment

`ecommerce_shipments`

- `id`, `uuid`
- `order_id` -> `ecommerce_orders.id`
- `shipment_no`
- `carrier`
- `tracking_no`
- `status`: pending, packed, shipped, delivered, failed, returned
- `shipped_at`
- `delivered_at`
- `shipping_address_json`
- `created_at`, `updated_at`, `deleted_at`

`ecommerce_shipment_items`

- `id`, `uuid`
- `shipment_id` -> `ecommerce_shipments.id`
- `order_item_id` -> `ecommerce_order_items.id`
- `quantity`
- `created_at`, `updated_at`, `deleted_at`

### Returns

`ecommerce_returns`

- `id`, `uuid`
- `order_id` -> `ecommerce_orders.id`
- `return_no`
- `status`: requested, approved, received, rejected, refunded, closed
- `reason`
- `refund_amount`
- `requested_at`
- `closed_at`
- `created_at`, `updated_at`, `deleted_at`

`ecommerce_return_items`

- `id`, `uuid`
- `return_id` -> `ecommerce_returns.id`
- `order_item_id` -> `ecommerce_order_items.id`
- `quantity`
- `reason`
- `condition_note`
- `created_at`, `updated_at`, `deleted_at`

### Marketing

`ecommerce_coupons`

- `id`, `uuid`
- `code`
- `name`
- `discount_type`: percentage, fixed_amount, free_shipping
- `discount_value`
- `min_order_value`
- `max_discount_value`
- `usage_limit`
- `used_count`
- `starts_at`
- `ends_at`
- `status`
- `is_active`, `created_at`, `updated_at`, `deleted_at`

`ecommerce_coupon_redemptions`

- `id`, `uuid`
- `coupon_id` -> `ecommerce_coupons.id`
- `order_id` -> `ecommerce_orders.id`, nullable
- `cart_id` -> `ecommerce_carts.id`, nullable
- `customer_profile_id` -> `ecommerce_customer_profiles.id`, nullable
- `discount_amount`
- `redeemed_at`

### Reviews And Wishlists

`ecommerce_reviews`

- `id`, `uuid`
- `publication_id` -> `ecommerce_product_publications.id`
- `product_id` -> `masters_products.id`
- `customer_profile_id` -> `ecommerce_customer_profiles.id`, nullable
- `order_item_id` -> `ecommerce_order_items.id`, nullable
- `rating`
- `title`
- `body`
- `status`: pending, approved, rejected, hidden
- `created_at`, `updated_at`, `deleted_at`

`ecommerce_wishlists`

- `id`, `uuid`
- `customer_profile_id` -> `ecommerce_customer_profiles.id`
- `name`
- `is_default`
- `created_at`, `updated_at`, `deleted_at`

`ecommerce_wishlist_items`

- `id`, `uuid`
- `wishlist_id` -> `ecommerce_wishlists.id`
- `publication_id` -> `ecommerce_product_publications.id`
- `product_id` -> `masters_products.id`
- `created_at`, `updated_at`, `deleted_at`

## API Shape

Private tenant workspace APIs:

- `GET /api/v1/ecommerce/dashboard`
- `GET/PATCH /api/v1/ecommerce/settings`
- `GET/POST/PATCH /api/v1/ecommerce/products`
- `GET/POST/PATCH /api/v1/ecommerce/collections`
- `GET/POST/PATCH /api/v1/ecommerce/customers`
- `GET/POST/PATCH /api/v1/ecommerce/orders`
- `GET/POST/PATCH /api/v1/ecommerce/shipments`
- `GET/POST/PATCH /api/v1/ecommerce/returns`
- `GET/POST/PATCH /api/v1/ecommerce/coupons`
- `GET /api/v1/ecommerce/reports/sales`
- `GET /api/v1/ecommerce/reports/products`
- `GET /api/v1/ecommerce/reports/customers`

Public storefront APIs:

- `GET /api/storefront/settings`
- `GET /api/storefront/categories`
- `GET /api/storefront/products`
- `GET /api/storefront/products/:slug`
- `POST /api/storefront/cart`
- `PATCH /api/storefront/cart/:uuid`
- `POST /api/storefront/checkout`
- `POST /api/storefront/orders`
- `GET /api/storefront/orders/:uuid/track`

Customer portal APIs:

- `POST /api/customer/auth/register`
- `POST /api/customer/auth/login`
- `POST /api/customer/auth/logout`
- `POST /api/customer/auth/forgot-password`
- `POST /api/customer/auth/reset-password`
- `GET /api/customer/dashboard`
- `GET/PATCH /api/customer/profile`
- `GET/POST/PATCH /api/customer/addresses`
- `GET /api/customer/orders`
- `GET /api/customer/orders/:uuid`
- `GET /api/customer/orders/:uuid/track`
- `GET /api/customer/payments`
- `GET /api/customer/wishlist`
- `POST/DELETE /api/customer/wishlist/items`
- `GET /api/customer/reviews`
- `POST /api/customer/reviews`
- `GET /api/customer/returns`
- `POST /api/customer/returns`
- `GET /api/customer/coupons`
- `GET /api/customer/notifications`

Public APIs must resolve tenant by domain and return only published/active storefront data. Customer portal APIs must also resolve tenant by domain, then authenticate the customer portal session. Private tenant workspace APIs must use authenticated tenant context.

## App Workflow

### Setup Workflow

1. Tenant enables Ecommerce app.
2. Tenant opens Store Settings.
3. Tenant configures store name, status, order prefix, currency, policies, and contact details.
4. Tenant connects payment, shipping, tax, and mail settings as separate subflows.
5. Store remains draft until required setup checks pass.

### Catalog Workflow

1. Tenant creates Product master records through existing Product master.
2. Tenant creates or reuses Product Categories from common data.
3. Tenant opens Ecommerce Products.
4. Tenant publishes selected Product records into `ecommerce_product_publications`.
5. Tenant adds storefront title, slug, copy, images, price, collection, SEO, and availability.
6. Product publication moves from draft to published.
7. Public storefront reads only active published publications.

### Customer Workflow

1. Customer is created from checkout, import, or tenant workspace.
2. Contact master stores customer identity.
3. Ecommerce customer profile stores portal status, marketing consent, defaults, and ecommerce-only preferences.
4. Customer address records store billing/shipping details and can snapshot into orders.

### Customer Portal Workflow

1. Customer registers from storefront, accepts an invitation, or creates an account during checkout.
2. Ecommerce creates or links a Contact master record, then creates `ecommerce_customer_profiles`.
3. Ecommerce creates `ecommerce_customer_portal_accounts` for login credentials and verification state.
4. Customer logs into the web portal through a customer-only auth flow.
5. Portal session is stored separately from tenant staff/admin sessions.
6. Customer dashboard reads only records linked to that customer profile/contact inside the resolved tenant.
7. Customer can update profile preferences and addresses without changing master fields that belong to staff-controlled Contact records.

### Customer Dashboard Workflow

1. Customer opens account dashboard after portal login.
2. Dashboard shows order summary, active shipments, payment status, wishlist count, return status, coupons, and profile completeness.
3. Customer opens order details and tracking from the dashboard.
4. Customer requests return, writes product review, updates address, or reorders previous items.
5. Every action writes to ecommerce-owned tables and keeps old order snapshots unchanged.

### Cart And Checkout Workflow

1. Public visitor adds a published product to cart.
2. Cart stores publication and product references with current price/tax calculations.
3. Checkout collects or confirms contact, billing address, shipping address, shipping method, coupon, and payment method.
4. Checkout converts cart to order.
5. Order stores customer, address, product, price, tax, and total snapshots.

### Order To Billing Workflow

1. Store order is placed in Ecommerce.
2. Tenant reviews order in Ecommerce Orders.
3. Tenant confirms order and optionally reserves stock.
4. Tenant generates a Sales entry only when ready for invoice/accounting.
5. Ecommerce order stores `sales_entry_uuid` after invoice creation.
6. Billing Sales remains the accounting/invoice source; Ecommerce remains the storefront order source.

### Fulfillment Workflow

1. Tenant packs order lines.
2. Shipment is created with carrier and tracking details.
3. Shipment items link to order items.
4. Shipment status updates order fulfillment status.
5. Delivery confirmation can trigger customer mail/SMS and report updates.

### Return Workflow

1. Customer or staff requests return against order/order item.
2. Tenant approves or rejects return.
3. Returned item is received and inspected.
4. Refund state updates payment/order records.
5. Inventory adjustment and billing credit note can be added in later phases.

## Frontend Pages

### Storefront Group

- Store Desk: KPIs, recent orders, setup status, catalog health, abandoned carts.
- Orders: order list, status pipeline, order detail, invoice link, shipment link.
- Carts: active/abandoned carts and recovery state.
- Checkout: checkout settings and test checkout session view.

### Catalog Group

- Products: publication list connected to Product master.
- Categories: category visibility and storefront ordering using common categories.
- Collections: merchandising groups.
- Variants: ecommerce display/availability layer over product attributes, without changing Product master.

### Customers Group

- Customers: ecommerce profiles connected to Contact master.
- Wishlists: customer saved items.
- Reviews: moderation queue.

### Web Customer Portal

- Login and Register: customer-only account entry resolved by storefront domain.
- Customer Dashboard: order totals, active deliveries, recent orders, wishlist, coupons, returns, and profile completion.
- My Orders: order list, order detail, invoice/download link when billing has generated it, shipment tracking, reorder action.
- My Profile: customer profile, email/phone verification status, marketing preference, password reset.
- Addresses: billing and shipping addresses linked to ecommerce customer profile.
- Wishlist: saved products and move-to-cart action.
- Reviews: purchased-product review submission and status.
- Returns: return request list and return detail.
- Payments: payment status and refund visibility.

### Fulfillment Group

- Shipping: shipment queue and carrier/tracking updates.
- Delivery Zones: shipping zone setup.
- Returns: return request and refund workflow.

### Marketing Group

- Coupons: discount rules.
- Campaigns: future mail/CRM campaign links.
- SEO: product/category/collection metadata health.

### Reports Group

- Sales Report
- Product Report
- Customer Report

### Settings Group

- Store Settings
- Payment Gateway
- Tax Settings

## Implementation Plan

### Phase 1: Module Foundation

- Create `apps/server/src/modules/ecommerce` as a real top-level tenant module because ecommerce is already a first-class dashboard app and live tenant capability.
- Add `domain`, `application`, `infrastructure`, `interface`, and module `index.ts`.
- Add ecommerce migration and register it in tenant database provisioning after Product and Contact master migrations, or make migration order explicitly safe for foreign-key creation.
- Add Kysely table interfaces to `tenant-database.schema.ts`.
- Add basic repository helpers for store settings, product publications, customer profiles, carts, orders, and shipments.
- Add authenticated tenant APIs under `/api/v1/ecommerce/*`.

### Phase 2: Catalog And Store Settings

- Build Store Settings page and API.
- Build Ecommerce Products page as a standalone feature page.
- Read Product master records as selectable source records.
- Write ecommerce publication records in `ecommerce_product_publications`.
- Use common product categories by reference and keep category storefront flags as they are.
- Add media and price records.
- Add public catalog APIs for published products and categories.

### Phase 3: Customers, Cart, And Checkout

- Add customer profile APIs linked to Contact master.
- Add customer portal account and session tables separate from tenant staff/admin auth.
- Add customer dashboard summary service scoped to the logged-in portal customer.
- Build cart and checkout tables/services.
- Add public cart and checkout APIs with domain-based tenant resolution.
- Add customer portal APIs for dashboard, profile, addresses, orders, wishlist, reviews, returns, and payments.
- Convert checkout sessions into ecommerce orders.
- Store snapshots for contact, address, product, price, and tax at order time.

### Phase 4: Orders And Billing Link

- Build Ecommerce Orders page and detail view.
- Add order status workflow.
- Add action to create Billing Sales entry from confirmed ecommerce order.
- Store the Sales entry public UUID back on ecommerce order.
- Keep invoice numbering, GST, print, and accounting behavior inside Billing.

### Phase 5: Fulfillment And Returns

- Build shipment queue and shipment detail.
- Add delivery zone and shipping-method settings.
- Add return request, approval, received, refund, and close workflow.
- Prepare hooks for inventory stock reservation and adjustment.

### Phase 6: Marketing And Reports

- Add coupons and redemption tracking.
- Add reviews and wishlist pages.
- Add sales, product, customer, cart abandonment, and fulfillment reports.
- Add mail/CRM hooks only through public module APIs or events.

### Phase 7: Public Storefront UI

- Replace static ecommerce shop scaffold with real tenant storefront pages.
- Add product listing, product detail, cart, checkout, order confirmation, and tracking pages.
- Add customer portal web pages for login, dashboard, profile, addresses, orders, wishlist, reviews, returns, and payments.
- Resolve tenant strictly through domain-resolution APIs.
- Fail closed when domain is not mapped to an active ecommerce tenant.

## Verification Plan

- Unit-test ecommerce services for status transitions, totals, coupon rules, and order snapshots.
- Migration-test all ecommerce tables with foreign keys to Product, Contact, and common category records.
- API-test authenticated tenant routes with tenant context.
- API-test public storefront routes with domain resolution and unpublished-product filtering.
- API-test customer portal auth/session isolation from tenant staff/admin auth.
- API-test customer dashboard data isolation so one customer cannot read another customer's orders.
- Frontend-test Ecommerce Product publication, Customer profile, Cart, Checkout, and Order flows.
- Frontend-test customer portal login, dashboard, order detail, address update, wishlist, review, and return request flows.
- Run `npm run typecheck:active` after TypeScript implementation.
- Run `npm run check` before release or handoff.

## Non-Goals For First Build

- Do not replace Product master.
- Do not replace Contact master.
- Do not add ecommerce-only columns to common or master tables.
- Do not mix TConnect marketplace review data into tenant ecommerce store records.
- Do not make Billing Sales the first order table; ecommerce order capture comes first, Billing Sales is generated when invoicing is needed.
- Do not expose private tenant order/customer data from public static pages.
- Do not let customer portal authentication grant access to tenant workspace, admin, or super-admin routes.
