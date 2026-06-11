# CXSun / Versatile OS - Architecture

## Existing Platform Shape

```text
React/Vite frontend
  -> Fastify API
  -> Master MariaDB
  -> TenantContextService
  -> Tenant MariaDB databases
```

The active app is a TypeScript monorepo:

| Layer | Technology | Purpose |
|-------|------------|---------|
| Frontend | React, Vite, Tailwind, shadcn-style UI | Public site, tenant workspace, admin desk, super-admin desk. |
| Backend | Fastify, TypeScript, custom decorators | API modules and platform runtime. |
| Persistence | Kysely + MariaDB | Master/platform database and tenant-isolated databases. |
| Queue | BullMQ / queue infrastructure | Background work and operational jobs. |
| Shared | `packages/shared` | Shared constants, types, and pure helpers. |
| Agent Provider | OpenRouter-compatible models | Cheap/free model routing for early MVP layers. |

## Agent OS Shape

```text
User prompt
  -> Conversation API
  -> Agent Router
  -> Specialized Agent
  -> Tool Registry / RAG Search / Read Models
  -> Backend API or Repository
  -> Agent response
  -> agent_logs + tool_executions + memory writes
```

Do not let a model write directly to the database. Mutations must go through named tools that call existing services or stable API contracts.

## Suggested Backend Module

```text
apps/server/src/modules/agent-os/
  agent-os.module.ts
  agent-os.controller.ts
  application/
    router.service.ts
    helper-agent.service.ts
    operator-agent.service.ts
    workflow-agent.service.ts
    planner-agent.service.ts
    analytics-agent.service.ts
    tool-registry.service.ts
  domain/
    agent.types.ts
    memory.types.ts
    tool.types.ts
  infrastructure/
    openrouter-model-client.ts
    rag-index.repository.ts
    conversation.repository.ts
    agent-log.repository.ts
    tool-execution.repository.ts
  database/
    agent-os.migration.ts
```

## Shared Agent Contract

```typescript
export interface VersatileAgent {
  id: string
  role: 'helper' | 'operator' | 'workflow' | 'planner' | 'analytics'
  canHandle(input: AgentInput, context: AgentContext): Promise<AgentScore>
  execute(input: AgentInput, context: AgentContext): Promise<AgentResult>
}

export interface AgentScore {
  agentId: string
  score: number
  reason: string
  safety: 'safe' | 'confirm' | 'blocked'
}

export interface AgentResult {
  success: boolean
  message: string
  toolCalls?: ToolCallResult[]
  memoryWrites?: MemoryWrite[]
  handoffTo?: string
}
```

## Tool Contract

```typescript
export interface AgentTool<TInput = unknown, TOutput = unknown> {
  name: string
  description: string
  inputSchema: unknown
  safety: 'read' | 'write' | 'destructive' | 'external'
  requiresConfirmation: boolean
  execute(input: TInput, context: AgentContext): Promise<TOutput>
}
```

## Data Tables To Add

Prefer master database tables for platform-wide agent infrastructure:

| Table | Purpose |
|-------|---------|
| `conversations` | Conversation threads and owning user/tenant context. |
| `agent_logs` | Router decisions, agent selection, prompts, model, latency, and errors. |
| `tool_executions` | Tool name, input summary, output summary, status, actor, confirmation state. |
| `agent_memories` | Durable preferences, project context, facts, and summaries. |
| `workflows` | Workflow definitions and execution state for chained actions. |
| `knowledge_documents` | Indexed docs/site/source chunks for Helper Agent RAG. |

Tenant-owned project/task records should stay in tenant databases when they are business data.

## Model Setup

Use OpenRouter-compatible providers so model choice can move without rewriting agents.

| Role | Initial Model Direction |
|------|-------------------------|
| Router | Gemini 2.5 Flash through OpenRouter free tier if available. |
| Helper | DeepSeek Chat or Qwen. |
| Planner | Gemini Flash. |
| Workflow | DeepSeek Reasoner. |
| Analytics | Qwen. |
| Fallback | Any healthy free OpenRouter model. |

Model names and availability change often, so implementation must read model IDs from config and allow fallback.

## Safety Rules

- Helper Agent is read-only.
- Operator Agent can only call registered tools.
- Workflow Agent can chain tools but cannot invent new tool names.
- Destructive tools require explicit confirmation.
- Tool executions must record tenant, actor, input summary, output summary, status, and error.
- Cross-tenant reads are blocked unless the actor is explicitly super-admin and the tool is platform-scoped.
