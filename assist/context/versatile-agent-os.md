# Versatile Agent OS Context

This file aligns future coding work with the ZRO plan for the AI operating layer.

## Product Direction

Build Versatile Agent as layered Agent OS, not one giant assistant.

```text
User
  -> Agent Router
  -> Specialized Agents
  -> Registered Tools / RAG / Backend APIs
  -> Database
```

The user should eventually see one AI experience. Internally the system should use narrow agents with clear jobs.

## Existing Platform To Use

Do not duplicate platform capabilities. Use the existing structure:

- Backend: `apps/server/src`
- Frontend: `apps/frontend/src`
- Master DB schema: `apps/server/src/infrastructure/database/schema.ts`
- Tenant DB schema: `apps/server/src/infrastructure/tenant-database/tenant-database.schema.ts`
- Tenant gateway: `TenantContextService`
- Task system: `apps/server/src/modules/task-manager`
- Site content: `apps/server/src/modules/site`
- Route families: public `/`, tenant `/app/*`, admin `/admin/*`, super-admin `/sa/*`

## Build Order

1. Helper Agent: read-only chat with platform knowledge.
2. Operator Agent: safe CRUD through typed tools.
3. Workflow Agent: chain tools into workflows.
4. Planner Agent: goals to roadmap/milestones/tasks.
5. Analytics Agent: read data and explain performance.
6. Agent Router: route and chain specialized agents.
7. Shared Memory: user profile, projects, tasks, preferences, history.
8. Full ecosystem: agent-to-agent handoffs and observable automation.

## P1 Implementation Boundary

First slice is Helper Agent only.

Allowed:

- Conversation endpoint.
- Model client abstraction.
- Knowledge ingestion/search.
- Agent logs.
- Read-only answers.
- Minimal chat UI.
- Dynamic capability and agent status payloads for the ZETRO dashboard.

Not allowed in P1:

- Creating/updating/deleting records.
- Browser automation.
- Direct database mutation from model output.
- Cross-tenant reads outside the current actor scope.

Current dashboard rule: status cards and the multi-agent stack must come from backend status, not frontend hardcoded labels. Planned agents should be visible but honest about their state until tools and routing exist.

Current chat rule: ZETRO conversations persist through `conversations` and `agent_logs`. The chat window should expose full-window history, dated saved chats, load previous chat, new chat from history, clear current chat, clear all history, rotating empty-state prompts, bottom model selection, and automatic scroll-to-latest without adding a duplicate chat storage table.

Current behavior rule: ZETRO has restricted user mode and super-admin mode. Tenant admins, managers, staff, users, and non-super platform roles get approved user/policy docs only, no model/provider/API details, no recommended technical updates, and no internal `assist/` or broad roadmap context. Runtime retrieval is restricted to `ZRO/ZETRO` docs only. Only `super-admin` can see provider setup, model controls, docs indexing, recommended updates, Agent OS setup context, and global history. Restricted legal, GST/tax, e-invoice/e-way, medical, investment, secrets, and compliance questions must stay general and direct the user to qualified professional review for final decisions.

Current business-data rule: ZETRO may answer approved read-only tenant queries for sales summaries, purchase summaries, and customer/supplier/contact-filtered summaries. Every business-data answer must resolve authenticated tenant context, filter by tenant, avoid mutation, and log the mapped intent for super-admin review.

Dedicated ZETRO docs live under `ZRO/ZETRO/docs`:

- `user`: product help, workflow guidance, and safe business-query examples.
- `admin`: super-admin provider, docs indexing, and console behavior.
- `policy`: audience behavior, data boundaries, restrictions, and refusal rules.
- `system`: indexing/source classification notes and read-only query tool contracts.

## Suggested Backend Placement

```text
apps/server/src/modules/agent-os/
```

Suggested first files:

```text
agent-os.module.ts
agent-os.controller.ts
application/helper-agent.service.ts
application/router.service.ts
application/knowledge.service.ts
domain/agent.types.ts
infrastructure/openrouter-model-client.ts
infrastructure/agent-log.repository.ts
infrastructure/knowledge.repository.ts
database/agent-os.migration.ts
```

## Required Tables

Start in the master database:

- `conversations`
- `agent_logs`
- `knowledge_documents`

Add when tools begin:

- `tool_executions`
- `agent_memories`
- `workflows`

Do not skip `agent_logs`.

## Tool Safety Rules

- Agents never invent executable tool names.
- Tool input validates against schema.
- Tool calls log actor, tenant, tool name, status, input summary, output summary, and error.
- Destructive tools require confirmation.
- Tenant-owned mutations must resolve through `TenantContextService`.

## Model Configuration

Use saved provider connections first, then environment config as fallback. ZETRO supports OpenRouter, OpenAI/GPT, Gemini, OpenCode Zen, and custom OpenAI-compatible providers through the API platform panel.

OpenRouter free model availability changes. For OpenRouter, refresh the free model list from the live `/api/v1/models` catalog and ignore stale saved defaults when a free slug has disappeared. Keep premium model IDs configurable by API panel/env.

Suggested defaults from the plan:

- Router: a currently available free/reasoning model through OpenRouter.
- Helper: a currently available free chat/instruct model through OpenRouter.
- Planner: Gemini/OpenRouter model when configured.
- Workflow: reasoning-capable OpenRouter/OpenCode/OpenAI-compatible model when configured.
- Analytics: Qwen/OpenRouter/OpenCode/OpenAI-compatible model when configured.
- Fallback: first currently available free OpenRouter text model.
