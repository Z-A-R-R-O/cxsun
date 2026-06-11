# CXSun / Versatile OS - Engineering Principles

## Platform Principles

- Keep platform/master data in the master MariaDB database.
- Keep tenant business data in tenant MariaDB databases.
- Use `TenantContextService` for tenant-owned APIs.
- Preserve route family boundaries: public `/`, tenant `/app/*`, admin `/admin/*`, super-admin `/sa/*`.
- Keep `packages/shared` framework-free.
- Keep source changes inside the owning module whenever possible.

## Agent Principles

- Build specialized agents, not one unrestricted assistant.
- Start with read-only knowledge before automation.
- All mutations must go through registered tools.
- Every tool has an input schema, safety level, permission rule, and log entry.
- Destructive actions require confirmation.
- Agent memory must never store secrets.
- Agent logs are product infrastructure, not optional debug noise.

## TypeScript Standards

- Prefer explicit domain types for agent inputs, outputs, scores, tools, and logs.
- Keep model-provider details behind an interface.
- Keep prompts and tool schemas versionable.
- Avoid `any` for tool inputs; use validated schemas or typed normalizers.
- Keep public IDs as UUID/public identifiers, not internal database IDs.

## Backend Standards

- Put Agent OS backend code under `apps/server/src/modules/agent-os`.
- Put platform-wide agent tables in the master database first.
- Put tenant-owned records, tasks, and future projects in tenant databases.
- Use service/repository boundaries matching existing modules.
- Register migrations in the correct platform or tenant migration registry.

## Frontend Standards

- Put Agent OS UI under `apps/frontend/src/features/agent-os`.
- Keep first chat UI simple, dense, and work-focused.
- Do not expose automation buttons before backend tools enforce confirmation and logging.
- Show clear summaries for any action workflow.

## Review Checklist

- [ ] Tenant boundary is respected.
- [ ] Agent action is logged.
- [ ] Tool input is validated.
- [ ] Destructive action requires confirmation.
- [ ] Model ID comes from config, not hardcoded service logic.
- [ ] Errors produce useful user messages and internal logs.
- [ ] ZRO docs and assist context are updated when behavior changes.

## Git Convention

Use the repository's current convention when requested to commit. Keep commits logical and avoid including unrelated user changes.
