# CXSun / Versatile OS - Quick Start Guide

## First Time Setup

```powershell
npm install
Copy-Item .env.sample .env
npm run dev
```

Root development commands:

```powershell
npm run dev
npm run dev:server
npm run dev:frontend
npm run check
npm run build:active
```

## How To Work

1. Read `ZRO/README.md`.
2. Read `ZRO/Vision/agent-os.md`.
3. Check `ZRO/Roadmap/masterplan.md`.
4. Pick a task from `ZRO/Execution/checklists/agent-os-checklist.md`.
5. Read `assist/README.md` and `assist/context/versatile-agent-os.md` before coding.
6. Build in the existing app structure.
7. Run targeted checks.
8. Create a `ZRO/Log/YYYY-MM-DD-HHmm.md` entry.
9. Update the checklist and roadmap.

## Current Code Locations

| What | Where |
|------|-------|
| Backend API | `apps/server/src` |
| Frontend app | `apps/frontend/src` |
| Shared types/utilities | `packages/shared/src` |
| Frontend UI primitives | `packages/ui/src` and `apps/frontend/src/components` |
| Platform database schema | `apps/server/src/infrastructure/database/schema.ts` |
| Tenant database schema | `apps/server/src/infrastructure/tenant-database/tenant-database.schema.ts` |
| Tenant context gateway | `apps/server/src/core/tenant/tenant-context.service.ts` |
| Task manager API | `apps/server/src/modules/task-manager` |
| Site/public content API | `apps/server/src/modules/site` |

## Agent OS Module Placement

Prefer a new backend module under:

```text
apps/server/src/modules/agent-os/
```

Suggested internal shape:

```text
agent-os/
  agent-os.module.ts
  agent-os.controller.ts
  application/
    router.service.ts
    helper-agent.service.ts
    operator-agent.service.ts
    workflow-agent.service.ts
  domain/
    agent.types.ts
    tool.types.ts
  infrastructure/
    model-client.ts
    rag.repository.ts
    agent-log.repository.ts
  database/
    agent-os.migration.ts
```

Frontend should live under:

```text
apps/frontend/src/features/agent-os/
```

Start small: a chat panel for Helper Agent before adding action execution.

## Verification

For documentation-only changes, inspect the changed files and run no build unless source code changed.

For backend changes:

```powershell
npm -w apps/server run typecheck
```

For frontend changes:

```powershell
npm -w apps/frontend run typecheck
```

For meaningful cross-app changes:

```powershell
npm run check
```
