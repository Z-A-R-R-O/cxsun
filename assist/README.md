# AI Agent Assist System

**Project version:** 1.0.66

This directory is the working guide for AI agents on `cxsun`. It records project rules, current architecture, session plans, task tracking, and release notes.

For the product north star, read `assist/context/product-picture.md`. It describes the software we are building: public storefront/content, tenant business workspace, admin support desk, and super-admin platform orchestration.

## Current Application Shape

The live workspace is a TypeScript monorepo with npm workspaces:

```
cxsun/
├── apps/
│   ├── server/      # Active Node.js/Fastify backend
│   ├── frontend/    # Active React + Vite frontend
│   └── cli/         # Local workflow helpers
├── packages/
│   ├── shared/      # Shared types, constants, and pure utilities
│   ├── web/         # Reserved web package
│   ├── desktop/     # Reserved Electron package
│   └── mobile/      # Reserved Expo package
└── assist/          # AI rules, context, templates, and session tracking
```

Root scripts use the active apps:

- `npm run dev` starts `apps/server` and `apps/frontend`.
- `npm run dev:server` starts only the backend.
- `npm run dev:frontend` starts only the frontend.
- `npm run check` runs the standard assist verification script.
- `npm run typecheck:active` typechecks all current workspaces.
- `npm run build:active` builds the active backend and frontend apps.

## Current Tenant Architecture

The active backend separates platform data from tenant data.

- Master MariaDB stores site content, industries, tenants, tenant domains, admin users, platform RBAC policy catalog, tenant policy toggles, and queue jobs.
- Tenant MariaDB databases store tenant-local companies, company child tables, accounting years, default company selection, and tenant-local RBAC role-policy assignments.
- Application tables keep `id INT AUTO_INCREMENT PRIMARY KEY` for internal joins and `uuid CHAR(8) NOT NULL UNIQUE` for public/API references. New public IDs are 8-character uppercase alphanumeric values from the shared public UUID helper; plan 16-character public IDs later when growth requires it.
- The request path for tenant data is `URL host/domain -> tenant_domains -> tenants -> JWT/user_tenants check -> tenant database`.
- `TenantContextService` is the runtime gateway for tenant-owned APIs. Company APIs already use it and require authenticated requests.
- `TenantDatabaseProvisioner` runs on server startup and prepares every MariaDB-backed tenant database before the API starts listening.

Current backend boundary layout:

- `apps/server/src/core`: framework/runtime primitives plus platform/core modules (`tenant`, `tenant-domain`, `industry`, `health`, `system/system-update`).
- `apps/server/src/shared`: backend-only shared helpers such as filters, guards, and middleware.
- `apps/server/src/infrastructure`: database, queue, tenant provisioning, auth helpers, and lifecycle adapters.
- `apps/server/src/modules/foundation`: reusable engines and compatibility registries (`master-record`, `master-data`).
- `apps/server/src/modules/common/<group>/<module>`: standalone common tenant modules.
- `apps/server/src/modules/master/<module>`: standalone master modules (`company`, `contact`, `product`, `order`).
- `apps/server/src/modules/entries/sales`: tenant-isolated sales entries.

Current important API surfaces:

- `POST /api/v1/auth/login`
- `GET /api/v1/tenant-domains/resolve`
- `GET /api/v1/tenant-domains`
- `POST /api/v1/tenant-domains/upsert`
- `GET /api/v1/tenants/context`
- `GET/POST /api/v1/industries`
- `GET/POST /api/v1/tenants`
- `GET/POST /api/v1/companies`
- `GET/POST /api/v1/contacts`
- `GET/POST /api/v1/products`
- `GET/POST /api/v1/orders`
- `GET/POST /api/v1/common/<moduleKey>`
- `GET/POST /api/v1/entries/sales`

## Dashboard Boundaries

The active frontend dashboard is split by authenticated role:

- `super-admin` sees two orchestration areas: Platform / Master Database for tenant, domain, industry, system update, and admin user manager; Tenant Database for tenant-owned modules such as company.
- `admin` sees the software operations dashboard for helpdesk, bugs, and update/support work.
- Tenant roles (`admin`, `manager`, `staff`, and `user`) see only the tenant dashboard, currently focused on tenant database companies and tenant-local roles. The `super-admin` role is reserved for the single platform owner account.

Keep these boundaries explicit when adding pages. Do not add platform orchestration pages to the tenant dashboard.

Route families:

- Tenant/client surface: `/app/*`, login `/login`.
- Admin helpdesk surface: `/admin/*`, login `/admin/login`.
- Super-admin surface: `/sa/*`, login `/sg/login`; `/sa/login` is accepted as an alias.

Each route family uses its own browser session key and route guard.

## Directory Structure

```
assist/
├── README.md          # This file, system overview
├── rules/             # AI behavior, coding, git, versioning, architecture, verification
├── templates/         # Templates for commits, pull requests, and server modules
├── scripts/           # Helper scripts for agent workflows
├── context/           # Long-term project context, decisions, and workspace map
├── agents/            # Role-specific agent configurations
├── execution/         # Current session plan and task checklist
└── documentation/     # Changelog, prompt review, and other docs
```

## Session Startup

At the start of each work session:

1. Read this file.
2. Read `assist/rules/`.
3. Read `assist/context/`.
4. Refresh `assist/execution/planning.md` and `assist/execution/task.md` for the current session.
5. Copy the exact user prompt into `assist/documentation/prompt-review.md` before starting the requested work.

## Key References

- `assist/context/workspaces.md` maps each workspace to its role and commands.
- `assist/context/product-picture.md` describes the product picture and implementation direction.
- `assist/context/live-client-scope.md` records the first real tenant/client, industry, app, and domain scope.
- `assist/rules/architecture.md` describes current app placement and module boundaries.
- `assist/rules/verification.md` describes required checks by change type.
- `assist/templates/server-module.md` gives the preferred backend module layout.

## Verification

Use targeted workspace commands while developing, then run the standard check before finalizing meaningful changes:

```
npm run check
```
