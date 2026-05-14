# Architecture Context

This file records the current project shape and decisions that should guide future AI-assisted work.

## Decision Records

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-05-14 | Use `apps/server` as the only active backend workspace. | `packages/server` was removed after a workspace naming collision; root scripts and CLI helpers now target `apps/server`. |
| 2026-05-14 | Use `apps/frontend` as the active React + Vite frontend. | The runnable UI is under `apps/frontend`; `packages/web` remains a reserved placeholder. |
| 2026-05-14 | Keep `packages/shared` framework-free. | Shared code should be portable across frontend, server, desktop, and mobile clients. |
| 2026-05-14 | Keep reserved packages minimal but typecheckable. | Placeholder packages should not break standard workspace verification. |

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
- Put active frontend UI work under `apps/frontend/src`.
- Put frontend CSS under `apps/frontend/src/assets/css`.
- Use Kysely with SQLite for current local persistence at `storage/database/cxsun.sqlite`.
- Production build artifacts belong under the root `build/` folder.
- The Docker deploy environment lives under `.container/` and is started with root `docker-compose.yml`.
- Do not move active frontend work into `packages/web` unless the project intentionally reintroduces that package as a real app.
