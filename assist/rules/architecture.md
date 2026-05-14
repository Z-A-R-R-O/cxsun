# Application Architecture

## Overview

ERP + Ecommerce + Multi-Tenant platform delivered across web, desktop, and mobile from a unified Node.js + TypeScript backend.

## Monorepo Structure

```
cxsun/
├── .env                        # Root env vars (shared credentials)
├── .env.sample                 # Template with all required vars
├── package.json                # Workspace root
├── tsconfig.base.json          # Shared TS config
├── assist/                     # AI agent rules & docs
│
└── packages/
    ├── shared/                 # Community shared code
    │   ├── types/              #   Domain types, interfaces
    │   ├── constants/          #   Shared constants, enums
    │   └── utils/              #   Pure utility functions
    │
    ├── server/                 # Node.js backend (API)
    │   └── src/
    │       ├── modules/        #   DDD modules (see below)
    │       ├── infrastructure/ #   DB, cache, queue setup
    │       └── middleware/     #   Global middleware
    │
    ├── web/                    # React SPA (Vite)
    │   └── src/
    │       ├── app/            #   App shell, layout, routing
    │       ├── features/       #   Feature modules
    │       └── components/     #   Shared UI components
    │
    ├── desktop/                # Electron desktop app
    │   └── src/
    │       ├── main/           #   Electron main process
    │       ├── preload/        #   Context bridge
    │       └── renderer/       #   React UI
    │
    └── mobile/                 # React Native + Expo
        └── src/
            ├── app/            #   App shell & navigation
            ├── features/       #   Feature modules
            └── navigation/     #   Screen routing
```

## Key Principles

- **Standalone apps** — each app (`web`, `desktop`, `mobile`) is independent with its own build, config, and deployment. They share only via `@cxsun/shared`.
- **Shared boundary** — `@cxsun/shared` contains only types, constants, and pure utilities. No runtime logic, no framework code.
- **Server owns the truth** — `@cxsun/server` is the single source of business logic. All apps consume its API.
- **Multi-tenant** — tenant isolation at the database level. Tenant context resolved in middleware.

## Module Structure (per DDD)

```
packages/server/src/modules/<module>/
├── domain/             # Entities, value objects, domain events
│   └── events/         # Domain events for cross-module communication
├── application/        # Use cases, application services, DTOs
├── infrastructure/     # Repositories, external adapters
│   └── database/
│       ├── migrations/ # Module-scoped migrations
│       └── seeders/    # Module-scoped seeders
├── interface/          # HTTP controllers, WebSocket handlers
└── index.ts            # Public API — exports only what others may consume
```

## Cross-App Communication

```
mobile ─┐
desktop ─┤─── HTTP/WS ───> server ───> Database
web ─────┘
              ^
              │
         @cxsun/shared (types, constants, utils)
```

## Environment Variables

Root `.env` feeds all packages. Each package reads its own prefix:
- `VITE_*` — consumed by web (Vite)
- `EXPO_PUBLIC_*` — consumed by mobile (Expo)
- `ELECTRON_*` — consumed by desktop (Electron)
- All others — consumed by server
