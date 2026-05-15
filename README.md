# cxsun

**Version:** 1.0.15

CXSun is a TypeScript monorepo for an ERP + ecommerce + multi-tenant platform. The current working application is a Node.js/Fastify backend paired with a React + Vite frontend using Tailwind CSS and shadcn-style UI primitives.

## Workspace Layout

```
cxsun/
├── apps/
│   ├── server/      # Active backend API
│   ├── frontend/    # Active React + Vite frontend
│   └── cli/         # Local workflow helpers
├── packages/
│   ├── shared/      # Shared types, constants, and pure utilities
│   ├── web/         # Reserved web package
│   ├── desktop/     # Reserved Electron package
│   └── mobile/      # Reserved Expo package
└── assist/          # AI agent rules, context, templates, and session tracking
```

## Tenant Runtime Flow

The current backend uses a two-layer persistence model:

- Platform database: local SQLite at `storage/database/cxsun.sqlite`.
- Tenant databases: MariaDB databases resolved per tenant and opened on demand.

Request flow for tenant-owned data:

```text
URL host / domain
  -> tenant_domains in platform SQLite
  -> tenants master record
  -> JWT + user_tenants access check
  -> tenant MariaDB connection
  -> tenant-local data such as companies and tenant RBAC
```

The active surfaces are:

- Domain resolution: `GET /api/v1/tenant-domains/resolve`
- Tenant diagnostics: `GET /api/v1/tenants/context`
- Auth: `POST /api/v1/auth/login`
- Platform master data: `GET/POST /api/v1/industries`, `GET/POST /api/v1/tenants`
- Tenant-owned data: `GET/POST /api/v1/companies`, resolved through `Authorization` and `x-tenant-code`

Tenant databases are provisioned during server startup for MariaDB-backed tenants. The server reads the platform records first, creates/migrates tenant databases, seeds tenant-local companies/RBAC, and then starts the Fastify API.

## Dashboard Boundaries

Authenticated users are routed to separate dashboard surfaces by role:

- `super-admin`: platform orchestration across tenants, industries, companies, client manager, updates, and system-level controls.
- `admin`: software operations for the people running the product, including helpdesk, bug triage, client notes, and updates.
- Tenant roles such as `tenant-admin` and `tenant-user`: isolated tenant dashboard for tenant-local companies and tenant-local RBAC roles.

Tenant dashboard pages must not expose platform tenant/industry/client-manager orchestration. Tenant-local roles and companies live inside the resolved tenant database.

Current frontend URL families:

- Tenant/client: `/app/*`, login at `/login`.
- Admin software desk: `/admin/*`, login at `/admin/login`.
- Super-admin orchestration: `/sa/*`, login at `/sg/login` with `/sa/login` also accepted.

Examples:

- `/app/company` opens tenant-local company management.
- `/admin/company` opens the admin helpdesk/company support desk.
- `/sa/company` opens the super-admin company surface.

Local SQLite storage is initialized at:

```text
storage/database/cxsun.sqlite
```

## Common Commands

```bash
npm run dev
npm run dev:server
npm run dev:frontend
npm run check
npm run typecheck:active
npm run build:active
```

Build outputs are written to the root `build/` folder:

- Backend: `build/server`
- Frontend: `build/frontend`
- Other emitted workspace output: `build/apps/*` and `build/packages/*`

Default local ports:

- Frontend: `6010`
- Backend: `6001`

## Active Development

- Backend work belongs in `apps/server`.
- Frontend work belongs in `apps/frontend`.
- Shared cross-workspace types, constants, and pure utilities belong in `packages/shared`.
- Reserved packages should stay typecheckable while minimal.
- Frontend styles belong under `apps/frontend/src/assets/css`.
- Backend platform persistence uses Kysely with SQLite.
- Tenant-owned company data uses Kysely with MariaDB through per-tenant connections.

## Docker Deploy Environment

The container setup is intentionally simple. It clones the GitHub repository, installs dependencies, builds into root `build/`, and runs the backend plus frontend preview.

```bash
docker compose -f .container/docker-compose.yml up --build
```

The container clones `https://github.com/CODEXSUN/cxsun.git` by default.

On first start the entrypoint creates `.env` from `.env.sample`, then configures the active ports before building.

Container ports:

- Backend: `6001`
- Frontend: `6010`

Override ports when needed:

```bash
PORT=7001 VITE_PORT=7010 VITE_API_BASE_URL=http://localhost:7001 docker compose -f .container/docker-compose.yml up --build
```

Manual update flow:

```bash
docker compose -f .container/docker-compose.yml exec cxsun bash
cd /workspace/cxsun
git pull --ff-only
npm ci
npm run build:active
exit
docker compose -f .container/docker-compose.yml restart cxsun
```

## AI Assist

Before AI-assisted work, read:

- `assist/README.md`
- `assist/rules/`
- `assist/context/`

The assist system documents the current architecture, verification flow, workspace map, and server module template.
