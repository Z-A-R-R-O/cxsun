# Application Architecture

## Overview

`cxsun` is an ERP + ecommerce + multi-tenant platform built as a TypeScript monorepo. The current working runtime is:

- Backend: `apps/server` (`@cxsun/server`), Node.js + Fastify with a custom decorator/bootstrap layer.
- Frontend: `apps/frontend` (`@cxsun/frontend`), React + Vite.
- Shared package: `packages/shared` (`@cxsun/shared`), for framework-free shared types, constants, and pure utilities.
- Workflow helpers: `apps/cli` (`@cxsun/cli`).

Reserved platform packages exist under `packages/` for future channels:

- `packages/web` (`@cxsun/web`) is a placeholder and is not the active Vite frontend.
- `packages/desktop` (`@cxsun/desktop`) is a minimal Electron placeholder.
- `packages/mobile` (`@cxsun/mobile`) is a placeholder Expo package.

## Monorepo Structure

```
cxsun/
├── .env                         # Root env vars, never commit secrets
├── .env.sample                  # Template with required vars
├── package.json                 # Workspace root and active scripts
├── tsconfig.base.json           # Shared TS config
├── apps/
│   ├── cli/                     # Local workflow scripts
│   ├── frontend/                # Active React + Vite app
│   │   ├── public/              # Static frontend assets
│   │   └── src/                 # Frontend source
│   └── server/                  # Active backend API
│       └── src/
│           ├── core/            # Framework/runtime and platform/core modules
│           ├── shared/          # Shared backend filters, middleware, helpers
│           ├── infrastructure/  # Database, queue, tenant provisioning, adapters
│           └── modules/         # Business modules and foundation engines
├── packages/
│   ├── shared/                  # Types, constants, pure utilities only
│   ├── web/                     # Placeholder package
│   ├── desktop/                 # Placeholder Electron package
│   └── mobile/                  # Placeholder Expo package
└── assist/                      # AI agent rules, context, and docs
```

## Key Principles

- Active development targets `apps/server` and `apps/frontend` unless the user explicitly asks for a reserved package.
- The server owns business logic and exposes APIs consumed by clients.
- Client apps must not duplicate server-owned domain logic.
- `@cxsun/shared` must stay framework-free: types, constants, and pure utilities only.
- Keep apps deployable independently. Share through `@cxsun/shared`, APIs, and documented contracts.
- Multi-tenant behavior belongs in server-side infrastructure and domain/application services.
- Tenant-owned APIs must resolve through `TenantContextService` before touching tenant-local data.
- Platform/master APIs use the master MariaDB database directly and must not accidentally read tenant-local tables.

## Backend Structure

The backend lives in `apps/server/src`.

```
apps/server/src/
├── main.ts
├── core/
│   ├── decorators/
│   ├── exceptions/
│   ├── guards/
│   ├── health/
│   ├── industry/
│   ├── interfaces/
│   ├── system/
│   ├── tenant/
│   ├── tenant-domain/
│   ├── bootstrap.ts
│   └── container.ts
├── shared/
│   ├── filters/
│   ├── guards/
│   └── middleware/
├── infrastructure/
│   ├── database/
│   ├── queue/
│   ├── tenant-database/
│   └── shutdown.ts
└── modules/
    ├── auth/
    ├── common/<group>/<module>/
    ├── entries/sales/
    ├── foundation/master-data/
    ├── foundation/master-record/
    ├── home/
    ├── master/company/
    ├── master/contact/
    ├── master/order/
    ├── master/product/
    └── site/
```

For new or expanded business modules, prefer:

- `domain/` for entities, value objects, and domain events.
- `application/` for use cases, DTOs, and application services.
- `infrastructure/` for repositories, database code, external adapters, migrations, and seeders.
- `interface/` for HTTP controllers, WebSocket handlers, and request/response adapters.
- `index.ts` for the module public API.

Avoid direct cross-module imports. Use explicit public module exports, application contracts, or events where module boundaries are involved.

## Backend Placement Rules

- Put framework runtime, decorators, DI, guards, and platform/core modules under `apps/server/src/core`.
- Put small backend-only shared helpers under `apps/server/src/shared`; do not use `src/common` for this because `modules/common` is a business module boundary.
- Put reusable engines and compatibility registries under `apps/server/src/modules/foundation`.
- Put every common business module under `apps/server/src/modules/common/<group>/<module>`.
- Put standalone master modules under `apps/server/src/modules/master/<module>`.
- Put tenant transaction/entry modules under `apps/server/src/modules/entries/<module>`.
- Keep internal folder moves API-stable unless the user explicitly requests a route change.

## Database Identity Rules

All application-owned tables must keep a compact internal primary key and a separate short public identifier:

```sql
id INT AUTO_INCREMENT PRIMARY KEY,
uuid CHAR(8) NOT NULL UNIQUE
```

- Use `id` for internal joins, foreign keys, repository lookups, and database performance.
- Use `uuid` for API payloads, frontend routing, public references, and anything exposed outside the persistence layer.
- At present, public IDs are 8 uppercase alphanumeric characters generated through the shared public UUID helper. When scale or collision risk grows, move new public IDs to 16 characters with a planned migration.
- Do not use the public `uuid` as the primary key unless the architecture rules are intentionally changed.

## Multi-Tenant Runtime

The current runtime follows this path for tenant-owned data:

```text
request URL host/domain
  -> platform tenant_domains table
  -> platform tenants table
  -> auth JWT + platform user_tenants access check
  -> per-tenant MariaDB connection
  -> tenant-local tables
```

Platform/master data lives in the MariaDB database configured by `DB_*` environment variables and is represented by `apps/server/src/infrastructure/database/schema.ts`. Platform database modules live beside their owning modules, then register through `apps/server/src/infrastructure/database/platform-modules.ts`.

Tenant-local data lives in MariaDB databases described by each tenant row. Tenant connection/provisioning code lives under `apps/server/src/infrastructure/tenant-database/`. Tenant database schema types live in `tenant-database.schema.ts`.

Current surface ownership:

- `tenant-domain`: platform domain-to-tenant resolution.
- `tenant`: platform tenant records, tenant diagnostics, startup provisioning input.
- `auth`: platform users, user-tenant access, JWT issuance.
- `industry`: platform master data shared across tenants.
- `company`: tenant-owned data; must use `TenantContextService`.

## Dashboard Boundaries

Frontend dashboard routing must remain split by role:

- `super-admin` is platform orchestration and can reach platform management surfaces.
- `admin` is software operations and should focus on bugs, helpdesk, client notes, and updates.
- Tenant users are isolated to tenant-local data such as companies and tenant-local RBAC roles.

When adding a dashboard page, first decide which dashboard mode owns it. Avoid relying only on hidden menu items; route guards should also reject pages outside the active dashboard mode.

Dashboard route families are:

- `/app/*` for tenant/client users with `/login`.
- `/admin/*` for admin/helpdesk users with `/admin/login`.
- `/sa/*` for super admins with `/sg/login` and `/sa/login` as an alias.

Each surface must keep its own auth storage key and auth gate. Do not let a tenant login unlock admin or super-admin routes.

## Frontend Structure

The active frontend lives in `apps/frontend/src`.

Preferred growth pattern:

```
apps/frontend/src/
├── app/             # App shell, routing, providers
├── features/        # User-facing feature areas
├── components/      # Shared UI components
├── assets/          # App-owned visual assets
├── App.tsx
└── main.tsx
```

Keep UI feature code in `apps/frontend` until a separate reusable package is intentionally introduced.

## Frontend Module Page Routing

- Every concrete user-facing module page must be routed to its own feature-owned page component under `apps/frontend/src/features/<module>/`.
- Route module pages explicitly from the dashboard/router to that feature page. Do not hide module ownership behind a generic page switch.
- Shared pages and registries, such as master-data or common-data screens, may provide reusable primitives and generic fallback behavior only.
- Do not grow generic pages with module-specific `if/else` branches for columns, filters, lookups, form layout, tabs, print behavior, or detail views.
- When a module needs custom behavior, create or extend that module's standalone page instead. Keep product code in product, contact code in contact, company code in company, sales code in sales, and so on.

## Cross-App Communication

```
frontend / future clients
          |
          | HTTP/WS
          v
apps/server
          |
          v
database / infrastructure

@cxsun/shared supplies shared types, constants, and pure utilities only.
```

## Environment Variables

Root `.env` feeds local development. Never commit real secrets.

- `VITE_*` is consumed by `apps/frontend`.
- `EXPO_PUBLIC_*` is reserved for `packages/mobile`.
- `ELECTRON_*` is reserved for `packages/desktop`.
- Server variables are consumed by `apps/server`.

Current default local ports:

- Frontend: `6010`
- Server: `6001`
