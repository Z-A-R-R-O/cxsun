# CXSun / Versatile OS - Release Runbook

## Current Release

- Project version: `1.0.91`
- Target: CXSun active apps and documentation.
- Runtime: Node.js 20+, npm 10+, MariaDB.

## Build Commands

From the repository root:

```powershell
npm install
npm run check
npm run build:active
```

Targeted commands:

```powershell
npm -w apps/server run typecheck
npm -w apps/frontend run typecheck
npm -w apps/server run build
npm -w apps/frontend run build
```

## Development Runtime

```powershell
npm run dev
```

Expected:

- Backend starts through `apps/cli/preflight.mjs`.
- Frontend starts through Vite.
- Master database connection is available.
- Tenant database provisioning succeeds for configured tenants.

## Docker Deployment

Use the existing container setup:

```powershell
docker compose -f .container/docker-compose.yml up --build
```

## Agent OS Release Notes

For the first Agent OS runtime release, include:

- Model configuration keys.
- Database migrations added.
- Feature flag or route added.
- Prompt/version notes.
- Safety behavior for unavailable tools.
- Verification prompts and outcomes.

## Release Guardrails

- Do not release Operator/Workflow Agent without `tool_executions`.
- Do not release destructive tools without confirmation.
- Do not release cross-tenant analytics without explicit super-admin checks.
- Do not commit `.env`.
