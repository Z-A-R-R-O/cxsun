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

Not allowed in P1:

- Creating/updating/deleting records.
- Browser automation.
- Direct database mutation from model output.
- Cross-tenant reads outside the current actor scope.

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

Use OpenRouter-compatible model IDs from config. Do not hardcode free model names in services because availability changes.

Suggested defaults from the plan:

- Router: Gemini Flash family through OpenRouter.
- Helper: DeepSeek Chat or Qwen.
- Planner: Gemini Flash.
- Workflow: DeepSeek Reasoner.
- Analytics: Qwen.
- Fallback: any configured free OpenRouter model.
