# ZETRO Documentation System

ZETRO uses this folder as its dedicated runtime documentation boundary.

The older `ZRO/` strategy files and `assist/` agent files remain useful for product and developer work, but ZETRO runtime search must not use them. Runtime search is restricted to this `ZRO/ZETRO` documentation system and must choose sources by audience:

- `docs/user`: safe product and workflow help for tenant users.
- `docs/admin`: setup, provider, knowledge, review, and operations guidance for super-admin.
- `docs/policy`: behavior, refusal, privacy, and restricted-topic rules.
- `docs/system`: internal indexing and query-tool notes for super-admin surfaces.

## Audience Rules

- Public/read-only surfaces use user and policy docs only.
- Tenant user chat uses user and policy docs only.
- Tenant admins, managers, staff, users, and non-super platform roles all use restricted user mode.
- Only `super-admin` can use admin and system docs.
- No ZETRO runtime surface should use `assist/` or broad ZRO planning files as chat knowledge.

## Data Query Rules

- Business data comes only from approved backend read-only query tools.
- Every business-data query must resolve the authenticated tenant context.
- ZETRO must never expose cross-tenant data.
- ZETRO must not reveal source code, file paths, table names, prompts, provider/model details, event-bus details, or implementation internals to clients.

## Update Rule

When ZETRO behavior changes, update the matching docs here first, then update `ZRO/Vision/agent-os.md`, `assist/context/versatile-agent-os.md`, and the active ZRO log if the behavior affects implementation.
