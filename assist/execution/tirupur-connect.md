# Tirupur Connect — Execution Prompt

> **Module scope**: New top-level business module group inside the existing CXSun monorepo.
> **Last updated**: 2026-06-09

---

## Preamble — Read Before Writing Any Code

You are implementing **Tirupur Connect**, a B2B trade platform module connecting Tirupur garment manufacturers with global buyers. This is a **new module inside an existing multi-tenant TypeScript monorepo** — not a standalone application.

Before writing any code, read and internalise:

| File | Why |
|------|-----|
| `assist/README.md` | Session startup, workspace overview |
| `assist/context/architecture.md` | Decision records, backend boundary map, tenant flow |
| `assist/context/product-picture.md` | Product north star, data model, route picture |
| `assist/context/workspaces.md` | Which workspace owns which code |
| `assist/context/live-client-scope.md` | Tenant 114 "Aaran Business Connect" is the closest reference |
| `assist/rules/architecture.md` | Backend placement, identity rules, dashboard boundaries |
| `assist/rules/coding.md` | Coding conventions |
| `assist/rules/verification.md` | Required checks before finalising changes |
| `assist/templates/server-module.md` | Canonical backend module layout |

---

## Critical Constraints

### DO

- Create Tirupur Connect as a **separate module group** under `apps/server/src/modules/tirupur-connect/`.
- Prefix all new database tables with `tc_`.
- Reuse the existing `TenantContextService` for tenant-scoped APIs.
- Reuse existing auth (`AuthModule`, `AuthGuard`, `AuthAnyGuard`, JWT).
- Reuse existing `@Module` decorator, DI container, and bootstrap layer.
- Reuse existing UI component library (`components/ui/*`, `components/blocks/*`).
- Reuse existing dashboard layout (`DashboardView`, `AppSidebar`).
- Follow the `id INT AUTO_INCREMENT PRIMARY KEY` + `uuid CHAR(8) NOT NULL UNIQUE` identity pattern.
- Generate UUIDs through the shared public UUID helper.
- Put frontend feature pages under `apps/frontend/src/features/tirupur-connect/`.
- Register new routes in the existing `App.tsx` router and `DashboardView` sidebar.
- Keep public HTTP routes under `/api/v1/tirupur-connect/*`.
- **Reuse existing common and master data tables** — see Master Data Reuse Strategy below.

### DO NOT

- Replace or rewrite any existing module, layout, auth, or navigation system.
- Modify unrelated business logic (sales, purchase, CRM, stock, GST, mail, etc.).
- Create a new application shell, login system, or standalone SPA.
- Place module code directly at `apps/server/src/modules/tirupur-connect.ts` — use the group directory pattern.
- Use any database table without the `tc_` prefix for this module.
- Break existing typecheck, build, or test verification.
- **Duplicate data that already exists in common or master tables** — use FK references.
- **Modify existing common or master table schemas** — create `tc_` extension tables for extra fields.

---

> [!IMPORTANT]
> ## Master Data Reuse Strategy — MANDATORY
>
> This is the single most important architectural rule for Tirupur Connect. The existing CXSun project already owns common and master data modules with tenant-isolated tables. **Tirupur Connect must reference these tables through foreign keys, not duplicate them.**

### Existing Tables You MUST Reuse

The following tables already exist in each tenant database and are managed by existing modules. **Do not create `tc_` equivalents for these.**

#### From `modules/common/location/` (tenant-scoped common tables)

| Existing Table | Table Name | Key Columns | Use In TC For |
|----------------|------------|-------------|---------------|
| Countries | `common_countries` | name, code, phone_code | Supplier country, buyer country, delivery country, export countries, lead country |
| States | `common_states` | name, code | Supplier state, factory state |
| Districts | `common_districts` | name | Location filtering |
| Cities | `common_cities` | name | Supplier city, event city |
| Pincodes | `common_pincodes` | code, area | Supplier pincode |

#### From `modules/common/product/` (tenant-scoped common tables)

| Existing Table | Table Name | Key Columns | Use In TC For |
|----------------|------------|-------------|---------------|
| Product Categories | `common_product_categories` | name | Product categorisation, RFQ categories |
| Product Groups | `common_product_groups` | name | Product grouping |
| Product Types | `common_product_types` | name | Product type filtering |
| Brands | `common_brands` | name | Brand selection |
| Colours | `common_colours` | name | Product colour variants |
| Sizes | `common_sizes` | name | Product size range |
| Units | `common_units` | name | Product/RFQ quantity units |
| HSN Codes | `common_hsn_codes` | code | Product HSN reference |

#### From `modules/common/others/` (tenant-scoped common tables)

| Existing Table | Table Name | Key Columns | Use In TC For |
|----------------|------------|-------------|---------------|
| Currencies | `common_currencies` | name, code, symbol | RFQ budget currency, lead currency, pricing |

#### From `modules/common/contacts/` (tenant-scoped common tables)

| Existing Table | Table Name | Key Columns | Use In TC For |
|----------------|------------|-------------|---------------|
| Contact Types | `common_contact_types` | name | Supplier/buyer contact type |
| Contact Groups | `common_contact_groups` | name | Contact grouping |

#### From `modules/master/contact/` (tenant-scoped master table)

| Existing Table | Table Name | Key Columns | Use In TC For |
|----------------|------------|-------------|---------------|
| Contacts | `masters_contacts` | code, name, gstin, pan, email, phone, website, description | Supplier profiles link to an existing contact record. Buyers link to an existing contact record. |

#### From `modules/master/product/` (tenant-scoped master table)

| Existing Table | Table Name | Key Columns | Use In TC For |
|----------------|------------|-------------|---------------|
| Products | `masters_products` | code, name, product_type_id, hsn_code_id, unit_id, tax_id | TC products extend master product records with TC-specific fields |

### How To Reference Existing Tables

**Pattern: FK reference + optional extension table**

When a TC table needs to reference existing data, store the foreign key `id` from the existing table. When TC needs additional fields beyond what the existing table provides, create a `tc_` extension table.

```sql
-- ✅ CORRECT: FK reference to existing common table
CREATE TABLE tc_supplier_profiles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  uuid CHAR(8) NOT NULL UNIQUE,
  contact_id INT NOT NULL,                    -- FK → masters_contacts.id
  country_id INT NULL,                        -- FK → common_countries.id
  state_id INT NULL,                          -- FK → common_states.id
  city_id INT NULL,                           -- FK → common_cities.id
  pincode_id INT NULL,                        -- FK → common_pincodes.id
  -- ... TC-specific fields that don't exist in contacts ...
  brand_name VARCHAR(255) NULL,
  cover_image_url VARCHAR(500) NULL,
  year_established INT NULL,
  factory_size VARCHAR(100) NULL,
  monthly_capacity VARCHAR(100) NULL,
  -- ...
);

-- ✅ CORRECT: TC product extends master product
CREATE TABLE tc_products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  uuid CHAR(8) NOT NULL UNIQUE,
  product_id INT NOT NULL,                    -- FK → masters_products.id
  supplier_profile_id INT NOT NULL,           -- FK → tc_supplier_profiles.id
  tc_category_id INT NULL,                    -- FK → tc_product_categories.id (TC-specific garment categories)
  -- ... TC-specific fields that don't exist in master products ...
  moq INT NULL,
  lead_time VARCHAR(100) NULL,
  fabric_details TEXT NULL,
  certification_details TEXT NULL,
  -- ...
);

-- ❌ WRONG: Duplicating country data
CREATE TABLE tc_countries (...)   -- DO NOT CREATE THIS

-- ❌ WRONG: Storing country as plain text
country VARCHAR(100)              -- DO NOT DO THIS
```

### When To Create TC-Specific Tables

Create a new `tc_` table only when:

1. **No equivalent exists** in common or master modules (e.g., `tc_rfq`, `tc_memberships`, `tc_verifications`, `tc_certifications`)
2. **TC needs a specialised category hierarchy** that differs from the generic common categories (e.g., `tc_product_categories` for garment-specific categories like T-Shirts, Polo Shirts, Hoodies — these are TC's trade directory categories, not the tenant's general product categories)
3. **TC needs extension fields** on top of an existing master record (e.g., `tc_products` extends `masters_products` with moq, lead_time, fabric_details)

### Frontend Data Loading

When building forms and filters in TC frontend pages:

- Load country, state, city, pincode dropdowns from the existing `/api/v1/common/countries`, `/api/v1/common/states`, etc. endpoints — do not create new TC API endpoints for this data.
- Load contact and product lookup data from existing `/api/v1/contacts` and `/api/v1/products` endpoints.
- Only create new TC API endpoints for TC-specific data (`tc_rfq`, `tc_certifications`, `tc_membership_plans`, etc.).

---

## Architecture Mapping

### Where This Module Lives

```
apps/server/src/modules/tirupur-connect/     ← new module group (like entries/, master/, crm/)
├── core/                                     ← shared TC services, types, constants
├── manufacturer/                             ← manufacturer registration & profiles
├── buyer/                                    ← buyer registration & profiles
├── product/                                  ← product catalog & categories
├── rfq/                                      ← RFQ lifecycle & quoting
├── directory/                                ← search & directory listings
├── lead/                                     ← buyer leads & matching
├── messaging/                                ← buyer-supplier messaging
├── membership/                               ← plans, verification levels
├── events/                                   ← trade shows & events
├── news/                                     ← industry news & articles
├── notification/                             ← TC-specific notifications
├── analytics/                                ← reports & statistics
├── admin/                                    ← TC admin management screens
└── index.ts                                  ← public exports + TirupurConnectModule

apps/frontend/src/features/tirupur-connect/   ← all TC frontend pages
├── public/                                   ← public-facing pages (home, directory, search)
├── manufacturer/                             ← manufacturer dashboard & forms
├── buyer/                                    ← buyer dashboard & forms
├── rfq/                                      ← RFQ pages
├── messaging/                                ← messaging UI
├── admin/                                    ← admin management screens
├── shared/                                   ← shared TC components (cards, filters, badges)
└── index.ts
```

### Database Layer

Tirupur Connect uses the **tenant MariaDB database** (resolved through `TenantContextService`), not the master/platform database. All tables are tenant-isolated.

Tirupur Connect does **not** create its own location, contact, or product base tables. It references the existing tenant-scoped `common_*` and `masters_*` tables through foreign keys and adds `tc_` extension tables only for fields that do not exist in the base tables.

Exception: If any TC table must be platform-wide (e.g., `tc_system_settings`), register it in `infrastructure/database/platform-modules.ts` and use the master database connection.

### Route Ownership

| Surface | Route Pattern | Auth |
|---------|---------------|------|
| Public TC pages | `/tirupur-connect`, `/tirupur-connect/*` | None (public) |
| Tenant TC dashboard | `/app/tirupur-connect/*` | Tenant JWT |
| Admin TC management | `/sa/tirupur-connect/*` | Super-admin JWT |

Register `tirupur-connect` in `staticPageSlugs` in `App.tsx` for the public landing page.

---

## Phase 1 — Foundation & Data Model

**Goal**: Establish database schema, migrations, core types, and module skeleton.

### 1.1 Database Tables

Create Kysely migrations under each sub-module's `infrastructure/database/migrations/` directory. Every table follows these rules:

```sql
-- Identity columns (mandatory on every table)
id INT AUTO_INCREMENT PRIMARY KEY,
uuid CHAR(8) NOT NULL UNIQUE,

-- Audit columns (mandatory on every table)
created_by INT NULL,
updated_by INT NULL,
deleted_by INT NULL,
created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
deleted_at TIMESTAMP NULL,

-- Tenant isolation (on root-level tables)
tenant_id INT NOT NULL,
company_id INT NULL,
```

#### Core Reference Tables

| Table | Purpose | Notes |
|-------|---------|-------|
| ~~`tc_countries`~~ | **DO NOT CREATE** | Use `common_countries` via FK reference |
| `tc_system_settings` | TC module configuration | Key-value settings for TC |
| `tc_activity_logs` | User activity tracking | Polymorphic: entity_type + entity_id |
| `tc_audit_history` | Full change history | JSON diff storage per record |

#### Supplier / Manufacturer Tables

| Table | Key Columns | FK References |
|-------|-------------|---------------|
| `tc_supplier_profiles` | contact_id (FK → `masters_contacts.id`), brand_name, logo_url, cover_image_url, about, year_established, business_type, iec_number, factory_address, designation, employee_count, factory_size, monthly_capacity, annual_turnover, min_order_qty, lead_time, social_media (JSON), verification_level, membership_plan_id, status | `country_id` → `common_countries.id`, `state_id` → `common_states.id`, `city_id` → `common_cities.id`, `pincode_id` → `common_pincodes.id` |
| `tc_supplier_export_countries` | supplier_profile_id, country_id (FK → `common_countries.id`) | Junction table replacing the export_countries JSON array |
| `tc_certifications` | name, issuing_body, description, icon_url | TC-specific, no equivalent in common |
| `tc_supplier_certifications` | supplier_profile_id, certification_id, certificate_number, issued_date, expiry_date, document_url, status | FK → `tc_supplier_profiles.id`, FK → `tc_certifications.id` |
| `tc_documents` | entity_type, entity_id, document_type, file_name, file_url, file_size, mime_type | Polymorphic reference |

> [!NOTE]
> **Why `contact_id` instead of duplicating name/email/phone/GSTIN?** The existing `masters_contacts` table already stores company name, legal name, GSTIN, PAN, email, phone, website, and description. The `tc_supplier_profiles` table extends a contact with TC-specific supplier metadata (factory size, capacity, brand name, verification level, etc.). When displaying a supplier, JOIN to `masters_contacts` for base identity fields.

#### Buyer Tables

| Table | Key Columns | FK References |
|-------|-------------|---------------|
| `tc_buyer_companies` | contact_id (FK → `masters_contacts.id`), buyer_type, annual_volume, description, status | `country_id` → `common_countries.id` |
| `tc_buyer_import_categories` | buyer_company_id, category_id (FK → `tc_product_categories.id`) | Junction table for import categories |
| `tc_buyer_target_products` | buyer_company_id, product_id (FK → `masters_products.id`) | Junction table for target products |

#### Product Tables

| Table | Key Columns | FK References |
|-------|-------------|---------------|
| `tc_product_categories` | name, slug, parent_id (self-ref), icon_url, sort_order, is_active | TC-specific garment trade categories (T-Shirts, Polo, Hoodies, etc.) — separate from `common_product_categories` which serves general tenant product categorisation |
| `tc_products` | product_id (FK → `masters_products.id`), supplier_profile_id (FK → `tc_supplier_profiles.id`), tc_category_id (FK → `tc_product_categories.id`), slug, description, moq, lead_time, fabric_details, certification_details, status | Extends master product with TC trade-listing fields |
| `tc_product_images` | tc_product_id (FK → `tc_products.id`), image_url, sort_order, is_primary | |
| `tc_product_colours` | tc_product_id, colour_id (FK → `common_colours.id`) | Junction table replacing colour_variants JSON |
| `tc_product_sizes` | tc_product_id, size_id (FK → `common_sizes.id`) | Junction table replacing size_range JSON |

> [!NOTE]
> **Why `tc_product_categories` exists alongside `common_product_categories`?** The existing common categories serve general tenant product management (for billing, inventory, etc.). TC needs its own garment-trade-specific category hierarchy (T-Shirts → Round Neck / V-Neck, Polo Shirts, Hoodies, etc.) that is specific to the Tirupur trade directory. These are different taxonomies for different purposes.

#### RFQ Tables

| Table | Key Columns | FK References |
|-------|-------------|---------------|
| `tc_rfq` | buyer_company_id (FK → `tc_buyer_companies.id`), title, description, tc_category_id (FK → `tc_product_categories.id`), quantity, delivery_deadline, certifications_required (JSON), budget_min, budget_max, status (enum) | `unit_id` → `common_units.id`, `delivery_country_id` → `common_countries.id`, `budget_currency_id` → `common_currencies.id` |
| `tc_rfq_responses` | rfq_id (FK → `tc_rfq.id`), supplier_profile_id (FK → `tc_supplier_profiles.id`), price_per_unit, total_amount, lead_time, moq, notes, proposal_url, status | `currency_id` → `common_currencies.id` |
| `tc_rfq_attachments` | rfq_id (FK → `tc_rfq.id`), file_name, file_url, file_size, mime_type | |

#### Membership & Verification Tables

| Table | Key Columns | FK References |
|-------|-------------|---------------|
| `tc_membership_plans` | name, slug, price, duration_months, features (JSON), max_products, max_rfq_responses, priority_listing, featured, verified_badge, analytics_access, sort_order, is_active | `currency_id` → `common_currencies.id` |
| `tc_memberships` | supplier_profile_id (FK → `tc_supplier_profiles.id`), plan_id (FK → `tc_membership_plans.id`), start_date, end_date, status, payment_reference | |
| `tc_verifications` | supplier_profile_id (FK → `tc_supplier_profiles.id`), level (enum), status (enum), reviewed_by, reviewed_at, notes, documents (JSON) | |

#### Lead & Inquiry Tables

| Table | Key Columns | FK References |
|-------|-------------|---------------|
| `tc_trade_leads` | buyer_company_id (FK → `tc_buyer_companies.id`), title, description, tc_category_id (FK → `tc_product_categories.id`), quantity, budget_range, status | `country_id` → `common_countries.id` |
| `tc_inquiries` | tc_product_id (FK → `tc_products.id`) or supplier_profile_id (FK → `tc_supplier_profiles.id`), buyer_company_id (FK → `tc_buyer_companies.id`), message, status | |
| `tc_contact_requests` | from_entity_type, from_entity_id, to_entity_type, to_entity_id, message, status | Polymorphic |
| `tc_saved_suppliers` | buyer_company_id (FK → `tc_buyer_companies.id`), supplier_profile_id (FK → `tc_supplier_profiles.id`) | |
| `tc_saved_products` | buyer_company_id (FK → `tc_buyer_companies.id`), tc_product_id (FK → `tc_products.id`) | |

#### Messaging Tables

| Table | Key Columns | FK References |
|-------|-------------|---------------|
| `tc_conversations` | participant_a_type, participant_a_id, participant_b_type, participant_b_id, subject, last_message_at, status | Polymorphic participant refs |
| `tc_messages` | conversation_id (FK → `tc_conversations.id`), sender_type, sender_id, body, is_read, read_at | |

#### Content Tables

| Table | Key Columns | FK References |
|-------|-------------|---------------|
| `tc_news_categories` | name, slug, sort_order | TC-specific |
| `tc_news` | category_id (FK → `tc_news_categories.id`), title, slug, excerpt, body, cover_image_url, author, published_at, is_featured, status | |
| `tc_events` | title, slug, description, event_type (enum), venue, start_date, end_date, registration_deadline, max_attendees, cover_image_url, status | `city_id` → `common_cities.id`, `country_id` → `common_countries.id` |
| `tc_event_registrations` | event_id (FK → `tc_events.id`), user_id, company_name, attendee_name, email, phone, status | |

#### Promotion Tables

| Table | Key Columns | FK References |
|-------|-------------|---------------|
| `tc_advertisements` | title, image_url, target_url, placement (enum), start_date, end_date, impressions, clicks, status | TC-specific |
| `tc_featured_listings` | entity_type, entity_id, position, start_date, end_date, status | Polymorphic |

#### Statistics Table

| Table | Key Columns | FK References |
|-------|-------------|---------------|
| `tc_statistics` | metric_key, metric_value, period_type, period_value, entity_type, entity_id | TC-specific |

#### Notification Table

| Table | Key Columns | FK References |
|-------|-------------|---------------|
| `tc_notifications` | user_id, type (enum), title, body, entity_type, entity_id, is_read, read_at | TC-specific |

### 1.2 Module Skeleton

Create the `TirupurConnectModule` following existing patterns:

```typescript
// apps/server/src/modules/tirupur-connect/tirupur-connect.module.ts
import { Module } from '../../core/decorators/module.js'
import { TenantContextService } from '../../core/tenant/tenant-context.service.js'
import { TenantRepository } from '../../core/tenant/infrastructure/tenant.repository.js'
import { TenantDomainRepository } from '../../core/tenant-domain/infrastructure/tenant-domain.repository.js'
import { AuthRepository } from '../auth/infrastructure/auth.repository.js'
// ... sub-module controllers and providers

@Module({
  controllers: [
    // Register all TC controllers here
  ],
  providers: [
    AuthRepository,
    TenantRepository,
    TenantDomainRepository,
    TenantContextService,
    // Register all TC services and repositories here
  ],
})
export class TirupurConnectModule {}
```

Register in `apps/server/src/modules/index.ts`:

```typescript
import { TirupurConnectModule } from './tirupur-connect/tirupur-connect.module.js'

@Module({
  imports: [
    // ... existing modules
    TirupurConnectModule,
  ],
  guards: [AuthGuard, AuthAnyGuard],
})
export class AppModule {}
```

### 1.3 Shared Types & Constants

Create under `apps/server/src/modules/tirupur-connect/core/`:

```
core/
├── tc.types.ts            ← shared TypeScript types for all TC sub-modules
├── tc.constants.ts        ← enums, status maps, verification levels, membership tiers
├── tc.events.ts           ← domain event definitions
└── tc.audit.ts            ← audit trail service shared across TC
```

Define all enums explicitly:

```typescript
// tc.constants.ts
export const TC_RFQ_STATUS = {
  DRAFT: 'draft',
  PENDING: 'pending',
  PUBLISHED: 'published',
  UNDER_REVIEW: 'under_review',
  QUOTED: 'quoted',
  NEGOTIATION: 'negotiation',
  AWARDED: 'awarded',
  CLOSED: 'closed',
  CANCELLED: 'cancelled',
} as const

export const TC_VERIFICATION_LEVEL = {
  BASIC: 'basic',
  VERIFIED: 'verified',
  ASSOCIATION_VERIFIED: 'association_verified',
  PREMIUM: 'premium_verified',
  GOLD: 'gold_verified',
} as const

export const TC_VERIFICATION_STATUS = {
  SUBMITTED: 'submitted',
  PENDING_REVIEW: 'pending_review',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  SUSPENDED: 'suspended',
  EXPIRED: 'expired',
} as const

export const TC_MEMBERSHIP_PLAN = {
  FREE: 'free',
  VERIFIED: 'verified',
  PREMIUM: 'premium',
  GOLD_PARTNER: 'gold_partner',
} as const

export const TC_USER_TYPE = {
  MANUFACTURER: 'manufacturer',
  EXPORTER: 'exporter',
  BUYER: 'buyer',
  BUYING_HOUSE: 'buying_house',
  SOURCING_AGENT: 'sourcing_agent',
  ASSOCIATION_MEMBER: 'association_member',
  PREMIUM_SUPPLIER: 'premium_supplier',
  GOLD_MEMBER: 'gold_member',
  ASSOCIATION_ADMIN: 'association_admin',
  PLATFORM_ADMIN: 'platform_admin',
} as const

export const TC_PRODUCT_CATEGORIES = [
  { name: 'T-Shirts', slug: 't-shirts' },
  { name: 'Polo Shirts', slug: 'polo-shirts' },
  { name: 'Hoodies', slug: 'hoodies' },
  { name: 'Sweatshirts', slug: 'sweatshirts' },
  { name: 'Kids Wear', slug: 'kids-wear' },
  { name: 'Sportswear', slug: 'sportswear' },
  { name: 'Activewear', slug: 'activewear' },
  { name: 'Innerwear', slug: 'innerwear' },
  { name: 'Organic Garments', slug: 'organic-garments' },
  { name: 'Fashion Wear', slug: 'fashion-wear' },
  { name: 'Uniforms', slug: 'uniforms' },
  { name: 'Private Label Manufacturing', slug: 'private-label' },
] as const
```

---

## Phase 2 — Backend Sub-Modules

**Goal**: Build each sub-module following the canonical module template.

Each sub-module follows this structure:

```
apps/server/src/modules/tirupur-connect/<sub-module>/
├── domain/
│   ├── <entity>.ts              ← entity type definitions
│   └── events/
│       └── <entity>-events.ts   ← domain events
├── application/
│   ├── dto/
│   │   ├── create-<entity>.dto.ts
│   │   └── update-<entity>.dto.ts
│   └── <entity>.service.ts      ← business logic
├── infrastructure/
│   └── database/
│       ├── migrations/
│       │   └── <timestamp>-create-tc-<table>.ts
│       └── <entity>.repository.ts
├── interface/
│   └── <entity>.controller.ts   ← HTTP routes under /api/v1/tirupur-connect/<entity>
├── <sub-module>.module.ts
└── index.ts
```

### 2.1 Manufacturer Sub-Module

**API Routes**: `/api/v1/tirupur-connect/suppliers`

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | `/register` | Create supplier profile | Tenant JWT |
| GET | `/` | List suppliers (with filters) | Public or JWT |
| GET | `/:uuid` | Get supplier detail | Public or JWT |
| PATCH | `/:uuid` | Update supplier profile | Tenant JWT (owner) |
| DELETE | `/:uuid` | Soft-delete supplier | Tenant JWT (owner/admin) |
| POST | `/:uuid/certifications` | Add certification | Tenant JWT (owner) |
| POST | `/:uuid/documents` | Upload documents | Tenant JWT (owner) |
| GET | `/:uuid/products` | List supplier products | Public or JWT |
| GET | `/:uuid/analytics` | Supplier analytics | Tenant JWT (owner) |

### 2.2 Buyer Sub-Module

**API Routes**: `/api/v1/tirupur-connect/buyers`

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | `/register` | Create buyer profile | Tenant JWT |
| GET | `/` | List buyers (admin) | Admin JWT |
| GET | `/:uuid` | Get buyer detail | JWT |
| PATCH | `/:uuid` | Update buyer profile | Tenant JWT (owner) |
| GET | `/:uuid/rfqs` | List buyer RFQs | Tenant JWT (owner) |
| GET | `/:uuid/saved-suppliers` | Saved suppliers | Tenant JWT (owner) |
| POST | `/:uuid/saved-suppliers` | Save a supplier | Tenant JWT (owner) |
| DELETE | `/:uuid/saved-suppliers/:supplierUuid` | Unsave supplier | Tenant JWT (owner) |

### 2.3 Product Sub-Module

**API Routes**: `/api/v1/tirupur-connect/products`

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | `/` | Create product | Tenant JWT (supplier) |
| GET | `/` | List/search products | Public or JWT |
| GET | `/categories` | List categories | Public |
| GET | `/:uuid` | Product detail | Public or JWT |
| PATCH | `/:uuid` | Update product | Tenant JWT (owner) |
| DELETE | `/:uuid` | Soft-delete product | Tenant JWT (owner/admin) |
| POST | `/:uuid/images` | Upload images | Tenant JWT (owner) |
| POST | `/:uuid/inquire` | Submit inquiry | JWT (buyer) |

### 2.4 RFQ Sub-Module

**API Routes**: `/api/v1/tirupur-connect/rfqs`

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | `/` | Create RFQ | Tenant JWT (buyer) |
| GET | `/` | List RFQs (filtered) | Public or JWT |
| GET | `/:uuid` | RFQ detail | JWT |
| PATCH | `/:uuid` | Update RFQ | Tenant JWT (owner) |
| PATCH | `/:uuid/status` | Change RFQ status | Tenant JWT (owner/admin) |
| POST | `/:uuid/respond` | Submit quote/response | Tenant JWT (supplier) |
| GET | `/:uuid/responses` | List responses | Tenant JWT (owner/admin) |
| POST | `/:uuid/attachments` | Upload attachments | Tenant JWT |

### 2.5 Directory Sub-Module

**API Routes**: `/api/v1/tirupur-connect/directory`

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/manufacturers` | Manufacturer directory | Public |
| GET | `/exporters` | Exporter directory | Public |
| GET | `/buyers` | Buyer directory | Admin JWT |
| GET | `/buying-houses` | Buying house directory | Public |
| GET | `/search` | Global search | Public |

**Search/filter parameters**: category, country, certification, moq, capacity, membership, verification, location, keyword.

### 2.6 Lead Sub-Module

**API Routes**: `/api/v1/tirupur-connect/leads`

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/` | List trade leads | JWT (members) |
| GET | `/:uuid` | Lead detail | JWT (paid members) |
| GET | `/matching` | Auto-matched leads for supplier | Tenant JWT |
| POST | `/:uuid/purchase` | Purchase/unlock lead | Tenant JWT |

### 2.7 Messaging Sub-Module

**API Routes**: `/api/v1/tirupur-connect/messages`

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/conversations` | List conversations | Tenant JWT |
| POST | `/conversations` | Start conversation | Tenant JWT |
| GET | `/conversations/:uuid` | Conversation messages | Tenant JWT |
| POST | `/conversations/:uuid/messages` | Send message | Tenant JWT |
| PATCH | `/conversations/:uuid/read` | Mark as read | Tenant JWT |
| GET | `/unread-count` | Unread message count | Tenant JWT |

### 2.8 Membership Sub-Module

**API Routes**: `/api/v1/tirupur-connect/memberships`

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/plans` | List membership plans | Public |
| POST | `/subscribe` | Subscribe to plan | Tenant JWT |
| GET | `/current` | Current membership | Tenant JWT |
| PATCH | `/:uuid/renew` | Renew membership | Tenant JWT |

### 2.9 Verification Sub-Module

**API Routes**: `/api/v1/tirupur-connect/verifications`

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | `/submit` | Submit for verification | Tenant JWT |
| GET | `/status` | Check verification status | Tenant JWT |
| GET | `/` | List pending verifications | Admin JWT |
| PATCH | `/:uuid/review` | Approve/reject verification | Admin JWT |

### 2.10 Events Sub-Module

**API Routes**: `/api/v1/tirupur-connect/events`

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/` | List events | Public |
| GET | `/:uuid` | Event detail | Public |
| POST | `/` | Create event | Admin JWT |
| POST | `/:uuid/register` | Register for event | Tenant JWT |
| GET | `/:uuid/attendees` | List attendees | Admin JWT |

### 2.11 News Sub-Module

**API Routes**: `/api/v1/tirupur-connect/news`

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/` | List articles | Public |
| GET | `/categories` | List news categories | Public |
| GET | `/:slug` | Article detail | Public |
| POST | `/` | Create article | Admin JWT |
| PATCH | `/:uuid` | Update article | Admin JWT |

### 2.12 Notification Sub-Module

**API Routes**: `/api/v1/tirupur-connect/notifications`

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/` | List notifications | Tenant JWT |
| PATCH | `/:uuid/read` | Mark as read | Tenant JWT |
| PATCH | `/read-all` | Mark all read | Tenant JWT |
| GET | `/unread-count` | Unread count | Tenant JWT |

### 2.13 Analytics/Reports Sub-Module

**API Routes**: `/api/v1/tirupur-connect/analytics`

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/overview` | Platform statistics | Admin JWT |
| GET | `/suppliers` | Supplier performance | Admin JWT |
| GET | `/buyers` | Buyer activity | Admin JWT |
| GET | `/rfqs` | RFQ statistics | Admin JWT |
| GET | `/leads` | Lead conversion | Admin JWT |
| GET | `/my-analytics` | Supplier's own analytics | Tenant JWT |

### 2.14 Admin Sub-Module

**API Routes**: `/api/v1/tirupur-connect/admin`

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/users` | All TC users | Admin JWT |
| GET | `/suppliers` | All suppliers with filters | Admin JWT |
| GET | `/buyers` | All buyers | Admin JWT |
| PATCH | `/suppliers/:uuid/status` | Change supplier status | Admin JWT |
| PATCH | `/buyers/:uuid/status` | Change buyer status | Admin JWT |
| GET | `/rfqs` | Monitor all RFQs | Admin JWT |
| GET | `/leads` | Monitor all leads | Admin JWT |
| GET | `/verifications/pending` | Pending verifications queue | Admin JWT |
| GET | `/memberships` | Membership overview | Admin JWT |
| GET | `/audit-log` | Full audit trail | Admin JWT |
| PATCH | `/settings` | Update TC settings | Admin JWT |
| GET | `/reports/export` | Export reports (CSV/PDF) | Admin JWT |

---

## Phase 3 — Audit History System

**Goal**: Implement a complete audit trail for all TC entities.

### Audit Service

Create `apps/server/src/modules/tirupur-connect/core/tc.audit.ts`:

```typescript
interface AuditEntry {
  entity_type: string      // 'supplier_profile' | 'rfq' | 'membership' | etc.
  entity_id: number
  action: string           // 'create' | 'update' | 'delete' | 'status_change' | 'verify' | etc.
  field_changes: Record<string, { old: unknown; new: unknown }> | null
  performed_by: number     // user id
  performed_at: Date
  ip_address: string | null
  metadata: Record<string, unknown> | null
}
```

### What Gets Audited

| Entity | Tracked Actions |
|--------|----------------|
| Supplier Profile | Create, update, delete, status change, verification change |
| Buyer Company | Create, update, delete, status change |
| Product | Create, update, delete, status change |
| RFQ | Create, update, status transitions (all 9 states) |
| RFQ Response | Create, update, accept, reject |
| Membership | Subscribe, renew, expire, cancel, upgrade |
| Verification | Submit, review, approve, reject, suspend, expire |
| Message | Send (not content, just metadata) |
| Lead | Create, purchase, convert |
| Document | Upload, delete |
| Admin Action | Any admin override or bulk operation |

### Implementation Pattern

Wrap every mutation service method with audit logging:

```typescript
async updateSupplierProfile(uuid: string, dto: UpdateSupplierDto, userId: number) {
  const existing = await this.repository.findByUuid(uuid)
  const changes = diffFields(existing, dto)
  const result = await this.repository.update(existing.id, dto)
  await this.auditService.log({
    entity_type: 'supplier_profile',
    entity_id: existing.id,
    action: 'update',
    field_changes: changes,
    performed_by: userId,
  })
  return result
}
```

---

## Phase 4 — Frontend Pages

**Goal**: Build all user-facing pages under `apps/frontend/src/features/tirupur-connect/`.

### 4.1 Public Pages (No Auth Required)

| Page | Route | Description |
|------|-------|-------------|
| TC Home | `/tirupur-connect` | Hero banner, stats, featured manufacturers, latest RFQs, events, CTA |
| Manufacturer Directory | `/tirupur-connect/manufacturers` | Searchable/filterable directory |
| Supplier Profile | `/tirupur-connect/suppliers/:uuid` | Full supplier detail page |
| Product Catalog | `/tirupur-connect/products` | Product grid with category filters |
| Product Detail | `/tirupur-connect/products/:uuid` | Product detail with inquiry form |
| RFQ Board | `/tirupur-connect/rfqs` | Public RFQ listings |
| Events | `/tirupur-connect/events` | Upcoming events |
| Event Detail | `/tirupur-connect/events/:uuid` | Event detail + registration |
| News | `/tirupur-connect/news` | Industry news |
| Article | `/tirupur-connect/news/:slug` | Article detail |

### 4.2 Authenticated Tenant Pages (Under `/app/tirupur-connect/*`)

| Page | Route | Role |
|------|-------|------|
| Supplier Dashboard | `/app/tirupur-connect/dashboard` | Supplier |
| Profile Setup | `/app/tirupur-connect/profile` | Supplier |
| My Products | `/app/tirupur-connect/products` | Supplier |
| Product Form | `/app/tirupur-connect/products/new` | Supplier |
| Incoming RFQs | `/app/tirupur-connect/rfqs` | Supplier |
| My Quotes | `/app/tirupur-connect/quotes` | Supplier |
| Buyer Dashboard | `/app/tirupur-connect/buyer-dashboard` | Buyer |
| My RFQs | `/app/tirupur-connect/my-rfqs` | Buyer |
| Create RFQ | `/app/tirupur-connect/rfqs/new` | Buyer |
| Saved Suppliers | `/app/tirupur-connect/saved-suppliers` | Buyer |
| Leads | `/app/tirupur-connect/leads` | Supplier |
| Messages | `/app/tirupur-connect/messages` | Both |
| Conversation | `/app/tirupur-connect/messages/:uuid` | Both |
| Notifications | `/app/tirupur-connect/notifications` | Both |
| Membership | `/app/tirupur-connect/membership` | Supplier |
| Verification | `/app/tirupur-connect/verification` | Supplier |
| Analytics | `/app/tirupur-connect/analytics` | Supplier |

### 4.3 Admin Pages (Under `/sa/tirupur-connect/*`)

| Page | Route |
|------|-------|
| TC Admin Overview | `/sa/tirupur-connect` |
| Supplier Management | `/sa/tirupur-connect/suppliers` |
| Buyer Management | `/sa/tirupur-connect/buyers` |
| RFQ Monitoring | `/sa/tirupur-connect/rfqs` |
| Lead Monitoring | `/sa/tirupur-connect/leads` |
| Verification Queue | `/sa/tirupur-connect/verifications` |
| Membership Management | `/sa/tirupur-connect/memberships` |
| Content Management | `/sa/tirupur-connect/content` |
| Reports & Analytics | `/sa/tirupur-connect/reports` |
| Audit Logs | `/sa/tirupur-connect/audit` |
| TC Settings | `/sa/tirupur-connect/settings` |

### 4.4 Homepage Sections

The public TC homepage (`/tirupur-connect`) must include these sections in order:

1. **Hero Banner** — title, subtitle, primary CTA "Find Manufacturers", secondary CTA "Post RFQ"
2. **Industry Statistics** — total manufacturers, exporters, products, RFQs, countries served (animated counters)
3. **Featured Manufacturers** — carousel of premium/gold suppliers with badges
4. **Verified Suppliers** — grid of recently verified suppliers
5. **Latest RFQs** — scrollable list of recent open RFQs
6. **Latest Buyer Leads** — teaser of recent trade leads
7. **Top Categories** — icon grid of 12 product categories
8. **Success Stories** — testimonial cards
9. **Association Updates** — latest news ticker
10. **Upcoming Events** — event cards with registration CTA
11. **Testimonials** — buyer/supplier quotes
12. **Call To Action** — registration CTA for both manufacturers and buyers
13. **Newsletter Subscription** — email capture form

### 4.5 Dashboard Design

#### Manufacturer Dashboard Cards

| Card | Data |
|------|------|
| Profile Completion | Percentage bar with "complete your profile" prompts |
| Products | Count + link to product management |
| Active RFQs | Count of RFQs targeting this supplier |
| Submitted Quotes | Count + conversion rate |
| New Leads | Unread lead count |
| Messages | Unread message count |
| Membership | Current plan + expiry + upgrade CTA |
| Verification | Current level + badge |
| Analytics | Views, inquiries, response rate sparkline |
| Documents | Uploaded document count |

#### Buyer Dashboard Cards

| Card | Data |
|------|------|
| My RFQs | Active/closed counts |
| Quotes Received | Total quotes across all RFQs |
| Saved Suppliers | Count + quick access |
| Messages | Unread count |
| Activity | Recent activity timeline |

---

## Phase 5 — Search & Filtering

**Goal**: Implement comprehensive search across all TC entities.

### Global Search

Create a unified search endpoint at `/api/v1/tirupur-connect/search`:

```typescript
interface SearchRequest {
  query: string
  type?: 'supplier' | 'product' | 'rfq' | 'lead' | 'all'
  filters?: {
    category?: string[]
    country?: string[]
    certification?: string[]
    moq_min?: number
    moq_max?: number
    capacity_min?: number
    capacity_max?: number
    membership?: string[]
    verification?: string[]
    location?: string
  }
  sort?: 'relevance' | 'newest' | 'rating' | 'capacity'
  page?: number
  limit?: number
}
```

### Saved Searches

Allow authenticated users to save search filters for quick repeat access.

---

## Phase 6 — Seed Data & Sample Content

**Goal**: Provide realistic seed data for development and demos.

Create seeders under each sub-module's `infrastructure/database/seeders/`:

| Seed | Content |
|------|---------|
| Categories | 12 product categories with icons |
| Countries | Major export destination countries |
| Membership Plans | Free, Verified, Premium, Gold Partner with features matrix |
| Certifications | GOTS, OEKO-TEX, ISO, WRAP, SEDEX, BCI, GRS, BSCI |
| Sample Suppliers | 10-15 realistic Tirupur manufacturer profiles |
| Sample Products | 3-5 products per sample supplier |
| Sample Buyers | 5-8 international buyer companies |
| Sample RFQs | 5-10 realistic RFQs with varied statuses |
| Sample News | 5 industry articles |
| Sample Events | 3 upcoming events |
| Membership Plans | Feature matrix for all 4 tiers |

---

## Phase 7 — Integration Points

### 7.1 Navigation Integration

Add to `AppSidebar` under the tenant dashboard:

```
Tirupur Connect (section header)
  ├── Dashboard
  ├── My Profile
  ├── Products
  ├── RFQs
  ├── Leads
  ├── Messages
  ├── Membership
  └── Analytics
```

Add to super-admin sidebar:

```
Tirupur Connect (section header)
  ├── Overview
  ├── Suppliers
  ├── Buyers
  ├── RFQs
  ├── Verifications
  ├── Memberships
  ├── Content
  ├── Reports
  └── Audit Logs
```

### 7.2 Notification Integration

Use the existing notification patterns if available, or create the `tc_notifications` table as a standalone TC notification system. Wire notifications for:

- New RFQ matching supplier's categories
- Quote received on supplier's RFQ response
- Message received
- Verification status change
- Membership expiry warning (30 days, 7 days, 1 day)
- New lead matching supplier's profile
- Admin alerts for pending verifications

### 7.3 Tenant Configuration

Add a TC-specific feature flag to company software settings:

```typescript
{ key: 'feature-tirupur-connect', default: false }
```

When disabled, hide all TC navigation, routes, and dashboard sections without deleting data.

---

## Phase 8 — SEO Pages

Generate static/SSR-friendly content pages:

| Page | Target Keyword |
|------|---------------|
| `/tirupur-connect/tirupur-manufacturers` | Tirupur Manufacturers |
| `/tirupur-connect/tirupur-exporters` | Tirupur Exporters |
| `/tirupur-connect/garment-suppliers` | Tirupur Garment Suppliers |
| `/tirupur-connect/textile-industry` | Tirupur Textile Industry |
| `/tirupur-connect/garment-manufacturers-india` | Garment Manufacturers in India |
| `/tirupur-connect/knitwear-manufacturers` | Knitwear Manufacturers |
| `/tirupur-connect/private-label-manufacturers` | Private Label Garment Manufacturers |
| `/tirupur-connect/organic-cotton-manufacturers` | Organic Cotton Manufacturers |

Each SEO page must include:

- Proper `<title>` and `<meta description>`
- Single `<h1>` with keyword
- Structured content with `<h2>`/`<h3>` hierarchy
- Semantic HTML5 elements
- Dynamic supplier/product listings from the database
- Internal links to relevant directory pages

---

## Verification Plan

### After Each Phase

Run these commands and fix any failures before proceeding:

```bash
npm -w apps/server run typecheck
npm -w apps/frontend run typecheck
npm -w apps/server run build
npm -w apps/frontend run build
```

### Full Verification

```bash
npm run check
```

### Manual Verification Checklist

- [ ] All `tc_*` tables created with correct identity and audit columns
- [ ] Migrations run cleanly on a fresh tenant database
- [ ] Seed data populates without errors
- [ ] Public pages load without authentication
- [ ] Authenticated pages redirect to login when no JWT
- [ ] Supplier registration creates profile and audit trail
- [ ] Buyer registration creates company and audit trail
- [ ] Product CRUD works with image upload
- [ ] RFQ lifecycle flows through all 9 statuses
- [ ] Messaging sends/receives between buyer and supplier
- [ ] Directory search returns filtered results
- [ ] Membership plan selection works
- [ ] Verification submission and admin review works
- [ ] Admin dashboard shows all management screens
- [ ] Notifications fire on key events
- [ ] TC feature flag hides all TC surfaces when disabled
- [ ] No existing module, route, or test is broken

---

## Execution Order

| Step | Phase | Deliverable |
|------|-------|-------------|
| 1 | Phase 1.1 | All `tc_*` migration files |
| 2 | Phase 1.2 | Module skeleton + registration in AppModule |
| 3 | Phase 1.3 | Shared types, constants, enums |
| 4 | Phase 2.1-2.2 | Manufacturer + Buyer sub-modules (full CRUD) |
| 5 | Phase 3 | Audit history system |
| 6 | Phase 2.3 | Product sub-module |
| 7 | Phase 2.4 | RFQ sub-module |
| 8 | Phase 2.5-2.7 | Directory, Lead, Messaging sub-modules |
| 9 | Phase 2.8-2.9 | Membership, Verification sub-modules |
| 10 | Phase 2.10-2.12 | Events, News, Notification sub-modules |
| 11 | Phase 2.13-2.14 | Analytics, Admin sub-modules |
| 12 | Phase 4.1 | Public frontend pages |
| 13 | Phase 4.2 | Tenant dashboard pages |
| 14 | Phase 4.3 | Admin management pages |
| 15 | Phase 4.4 | Homepage sections |
| 16 | Phase 5 | Search & filtering |
| 17 | Phase 6 | Seed data |
| 18 | Phase 7 | Navigation, notification, and feature flag integration |
| 19 | Phase 8 | SEO pages |
| 20 | Verify | Full verification pass |

---

## Brand Content Reference

| Element | Value |
|---------|-------|
| Platform Name | Tirupur Connect |
| Tagline | Connecting Global Buyers with Trusted Tirupur Manufacturers |
| Positioning | The Official Digital Trade Platform of Tirupur Garment Industry |
| Hero Title | The Official Digital Trade Platform for Tirupur Manufacturers and Global Buyers |
| Hero Subtitle | Discover verified manufacturers, exporters, suppliers and sourcing partners from Tirupur. Connect directly, request quotations and build long-term business relationships. |
| Primary CTA | Find Manufacturers |
| Secondary CTA | Post RFQ |
