# ZETRO Documentation System

ZETRO uses this folder as its dedicated runtime documentation boundary.

The older `ZRO/` strategy files and `assist/` agent files remain useful for product and developer work, but ZETRO should not expose all of them to every user. Runtime search must choose sources by audience:

- `docs/user`: safe product and workflow help for tenant users.
- `docs/admin`: setup, provider, knowledge, and operations guidance for admins.
- `docs/policy`: behavior, refusal, privacy, and restricted-topic rules.
- `docs/system`: internal indexing and implementation notes for admin/developer surfaces.

## Audience Rules

- Public/read-only surfaces use user and policy docs only.
- Tenant user chat uses user and policy docs only.
- Admin chat and admin console can also use admin and system docs.
- Developer-only context can include `assist/` and broader ZRO planning files when explicitly requested by an admin/developer surface.

## Update Rule

When ZETRO behavior changes, update the matching docs here first, then update `ZRO/Vision/agent-os.md`, `assist/context/versatile-agent-os.md`, and the active ZRO log if the behavior affects implementation.
