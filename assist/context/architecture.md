# Architecture Context

This file records the current project shape and decisions that should guide future AI-assisted work.

Read `assist/context/product-picture.md` alongside this file for the product-level picture of what CXSun is becoming.

## Decision Records

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-05-14 | Use `apps/server` as the only active backend workspace. | `packages/server` was removed after a workspace naming collision; root scripts and CLI helpers now target `apps/server`. |
| 2026-05-14 | Use `apps/frontend` as the active React + Vite frontend. | The runnable UI is under `apps/frontend`; `packages/web` remains a reserved placeholder. |
| 2026-05-14 | Keep `packages/shared` framework-free. | Shared code should be portable across frontend, server, desktop, and mobile clients. |
| 2026-05-14 | Keep reserved packages minimal but typecheckable. | Placeholder packages should not break standard workspace verification. |
| 2026-05-15 | Use platform SQLite plus tenant MariaDB databases. | Historical decision; replaced on 2026-05-24 when master/platform persistence moved to MariaDB. |
| 2026-05-24 | Use MariaDB for both master/platform persistence and tenant-isolated databases. | Platform metadata now uses the same deployable database engine as tenants, avoiding SQLite concurrency and deployment limits while preserving tenant database isolation. |
| 2026-05-15 | Split dashboards into super-admin, admin, and tenant modes. | Platform orchestration, software support operations, and tenant-isolated company/RBAC work have different responsibilities and should not share one mixed dashboard. |
| 2026-05-16 | Keep framework/platform modules in `core`, reusable record engines in `modules/foundation`, and business modules in bounded module groups. | The backend now separates core runtime, shared helpers, foundation primitives, CRM, master, common, and entries so modules can be reused, dropped, or enhanced independently. |
| 2026-05-16 | Use `id INT AUTO_INCREMENT PRIMARY KEY` plus `uuid CHAR(8) NOT NULL UNIQUE` on application tables. | Numeric IDs stay fast and stable for internal joins, while short uppercase alphanumeric public UUIDs hide sequence IDs from APIs and UI. Move public UUIDs to 16 characters later when scale requires it. |
| 2026-05-22 | Route user-facing frontend modules to feature-owned standalone pages. | Product, contact, company, sales, and future modules should keep custom UI behavior inside their own feature pages instead of expanding generic master-data/common-data pages with module-specific branches. |

## Active Workspaces

- `apps/server` (`@cxsun/server`): active backend API using Fastify and the custom `core/` decorator/bootstrap layer.
- `apps/frontend` (`@cxsun/frontend`): active React + Vite frontend using Tailwind CSS and shadcn-style UI primitives.
- `apps/cli` (`@cxsun/cli`): local helper scripts such as preflight port checks and GitHub helpers.
- `packages/shared` (`@cxsun/shared`): shared types, constants, and pure utilities.

## Reserved Workspaces

- `packages/web` (`@cxsun/web`): reserved package with minimal source.
- `packages/desktop` (`@cxsun/desktop`): reserved Electron package with minimal stubs.
- `packages/mobile` (`@cxsun/mobile`): reserved Expo package with minimal source.

## Current Verification Pattern

Run targeted checks during development, or `npm run check` before finalizing meaningful changes.

- `npm -w apps/server run typecheck`
- `npm -w apps/frontend run typecheck`
- `npm -w packages/shared run typecheck`
- `npm -w packages/web run typecheck`
- `npm -w packages/desktop run typecheck`
- `npm -w packages/mobile run typecheck`
- `npm -w apps/server run build`
- `npm -w apps/frontend run build`

## Implementation Notes

- Put server business modules under `apps/server/src/modules`.
- Put backend framework code and platform/core modules under `apps/server/src/core`.
- Put backend cross-cutting shared helpers under `apps/server/src/shared`.
- Put reusable generic module engines under `apps/server/src/modules/foundation`.
- Put CRM modules under `apps/server/src/modules/crm`.
- Put standalone master modules under `apps/server/src/modules/master`.
- Put business common modules under `apps/server/src/modules/common/<group>/<module>`.
- Put tenant entries under `apps/server/src/modules/entries`.
- Put infrastructure configuration and lifecycle code under `apps/server/src/infrastructure`.
- Put platform database migration/seed modules beside the owning backend module and register them in `apps/server/src/infrastructure/database/platform-modules.ts`.
- Put tenant database connection, provisioning, and tenant-local schema types under `apps/server/src/infrastructure/tenant-database`.
- Use `TenantContextService` for tenant-owned APIs. It resolves `x-tenant-code`, JWT tenant code, or host/domain to a tenant, verifies user access, checks tenant policy, and returns the tenant-local database handle.
- Put active frontend UI work under `apps/frontend/src`.
- Route concrete frontend module pages to standalone feature-owned pages under `apps/frontend/src/features/<module>/`; keep generic master/common pages limited to reusable primitives or fallback behavior.
- Put frontend CSS under `apps/frontend/src/assets/css`.
- Use Kysely with MariaDB for platform/master persistence through `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, and `DB_PASSWORD`.
- Use Kysely with MariaDB for tenant-owned data such as companies, company child tables, accounting years, default company records, and tenant-local RBAC role-policy mappings. Tenant databases reuse the same host/user/password env values, while each tenant row owns its own database name.
- Keep `id` as the internal primary key and `uuid` as the public identifier on application-owned tables. Current public UUIDs are 8-character uppercase alphanumeric values generated by the shared helper; plan a 16-character migration later when growth requires it.
- Production build artifacts belong under the root `build/` folder.
- The Docker deploy environment lives under `.container/` and is started with root `docker-compose.yml`.
- Do not move active frontend work into `packages/web` unless the project intentionally reintroduces that package as a real app.

## Tenant Flow Notes

Current request flow for tenant-owned data:

```text
URL host/domain
  -> tenant_domains
  -> tenants
  -> auth JWT and user_tenants
  -> TenantContextService
  -> tenant MariaDB database
```

Scan status as of 2026-05-15:

- `tenant-domain` resolves active domains against active tenants from the master MariaDB database.
- `tenant` owns tenant records and `/api/v1/tenants/context`; this diagnostic endpoint now resolves by `x-tenant-code` or host/domain.
- `auth` issues JWTs after validating platform users and selects the domain tenant when the login host maps to one of the user's tenants.
- `industry` is platform master data and remains tenant-shared.
- `company` is tenant-owned, lives under `modules/master/company`, and resolves through `TenantContextService` before reading or mutating tenant-local MariaDB tables.

## Backend Boundary Map

Current backend structure:

```text
apps/server/src/
  core/
    decorators/
    exceptions/
    guards/
    health/
    industry/
    interfaces/
    system/system-update/
    tenant/
    tenant-domain/
  shared/
    filters/
    guards/
    middleware/
  infrastructure/
    database/
    queue/
    tenant-database/
  modules/
    auth/
    common/<group>/<module>/
    crm/client/
    entries/sales/
    foundation/master-data/
    foundation/master-record/
    home/
    master/company/
    master/contact/
    master/order/
    master/product/
    site/
```

Boundary rules:

- `core` is for framework primitives and platform/core modules: tenant, tenant-domain, industry, health, auth guard, and system update.
- `shared` is for backend helpers that are not business modules, such as filters, middleware, and simple reusable guards.
- `foundation/master-record` is the reusable record engine: definition contracts, migration helpers, aggregate, repository, events, normalizer, and event bus.
- `foundation/master-data` is the compatibility registry/API around common module definitions. It must not become the owner of standalone master modules.
- `common/<group>/<module>` modules own common tenant tables and endpoints under `/api/v1/common/<moduleKey>`.
- `master/<module>` modules own standalone master domains such as company, contact, product, and order.
- `crm/client` owns the platform Client Manager surface and platform `clients` table.
- `entries/sales` owns tenant sales entry records, comments, tools, activity, and queue events.
- Keep public HTTP routes stable when moving internal folders unless the user explicitly asks to change the API.

## Dashboard Mode Notes

- `super-admin`: split into two clear navigation areas. Platform / Master Database contains tenant, domain, industry, client manager, system update, and user manager. Tenant Database contains tenant-owned modules such as company.
- `admin`: software operations; helpdesk, bug triage, client notes, and system update.
- `tenant`: isolated client workspace; tenant database companies and tenant-local roles.

The frontend enforces this with dashboard mode route guards in `DashboardView` and separate sidebar menus in `AppSidebar`.

Route map:

- `/app/company`: tenant/client company surface using the selected tenant database.
- `/admin/company`: admin/helpdesk company support desk, not tenant-local company management.
- `/sa/company`: super-admin company surface.
- `/login`: tenant/client login.
- `/admin/login`: admin/helpdesk login.
- `/sg/login`: super-admin login; `/sa/login` is accepted for consistency with the `/sa/*` route family.

Auth sessions are stored separately by surface to avoid cross-surface unlocks.
