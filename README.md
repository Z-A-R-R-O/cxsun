# cxsun

**Version:** 1.0.12

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
- Backend persistence currently uses Kysely with SQLite.

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
