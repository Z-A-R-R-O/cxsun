# CXSun / Versatile OS - Shipped Inventory

## Existing Platform Foundation

Implemented before Agent OS work:

- TypeScript monorepo with active `apps/server` and `apps/frontend`.
- Fastify backend with custom decorator/bootstrap layer.
- React/Vite frontend with route families for public, tenant, admin, and super-admin surfaces.
- MariaDB master database for platform data.
- Tenant-isolated MariaDB databases for business data.
- Tenant/domain/auth/company/industry architecture.
- Task manager with task CRUD, comments, subtasks, attachments, campaigns, reminders, templates, categories, tags, settings, and automation page.
- Business modules for common data, master records, entries, stock, mail, GST, auditor workflows, and integrations.
- Assist documentation describing current architecture and workflow rules.

Validation status:

- Existing source verification is handled by `npm run check`.
- This Agent OS update is documentation-only and does not change runtime behavior.

## Agent OS

Shipped in this documentation update:

- ZRO strategy converted from template placeholders to concrete Versatile Agent OS plan.
- Dedicated `ZRO/Vision/agent-os.md` architecture/spec.
- Agent OS roadmap and phase gates.
- Agent OS implementation checklist.
- Assist context file for future coding agents.
- Backend `agent-os` module base with `/api/v1/agent-os/status`.
- Backend `/api/v1/agent-os/chat` base endpoint that logs chat attempts without live provider calls.
- Master database migration base for `conversations`, `agent_logs`, and `knowledge_documents`.
- Tenant dashboard `ZETRO` app entry with a small Bot icon shortcut in the header.
- Base frontend Agent OS page showing readiness and next build steps.
- Universal ZETRO chat window shell with switchable model selector.
- ZETRO model config keys in `.env.sample`.

Not shipped yet:

- Helper Agent chat UI/API.
- RAG index.
- OpenRouter model client.
- Tool execution, memory, and workflow tables.

## Architecture Decisions

- Build multi-agent layers instead of one giant agent.
- Start with read-only Site Helper Agent.
- Require `agent_logs` from the beginning.
- Route all mutations through typed tools and backend services.
- Preserve tenant isolation for all agent reads and writes.
