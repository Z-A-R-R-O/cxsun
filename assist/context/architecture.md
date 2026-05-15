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
| 2026-05-15 | Use platform SQLite plus tenant MariaDB databases. | Platform metadata resolves URL/domain, tenant, users, and policies; tenant-owned company data is isolated in tenant databases. |
| 2026-05-15 | Split dashboards into super-admin, admin, and tenant modes. | Platform orchestration, software support operations, and tenant-isolated company/RBAC work have different responsibilities and should not share one mixed dashboard. |

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
- Put shared backend framework code under `apps/server/src/core`.
- Put backend cross-cutting middleware, guards, and filters under `apps/server/src/common`.
- Put infrastructure configuration and lifecycle code under `apps/server/src/infrastructure`.
- Put platform database migration/seed modules beside the owning backend module and register them in `apps/server/src/infrastructure/database/platform-modules.ts`.
- Put tenant database connection, provisioning, and tenant-local schema types under `apps/server/src/infrastructure/tenant-database`.
- Use `TenantContextService` for tenant-owned APIs. It resolves `x-tenant-code`, JWT tenant code, or host/domain to a tenant, verifies user access, checks tenant policy, and returns the tenant-local database handle.
- Put active frontend UI work under `apps/frontend/src`.
- Put frontend CSS under `apps/frontend/src/assets/css`.
- Use Kysely with SQLite for platform persistence at `storage/database/cxsun.sqlite`.
- Use Kysely with MariaDB for tenant-owned data such as companies, company child tables, accounting years, default company records, and tenant-local RBAC role-policy mappings.
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

- `tenant-domain` resolves active domains against active tenants from platform SQLite.
- `tenant` owns tenant records and `/api/v1/tenants/context`; this diagnostic endpoint now resolves by `x-tenant-code` or host/domain.
- `auth` issues JWTs after validating platform users and selects the domain tenant when the login host maps to one of the user's tenants.
- `industry` is platform master data and remains tenant-shared.
- `company` is tenant-owned and resolves through `TenantContextService` before reading or mutating tenant-local MariaDB tables.

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
