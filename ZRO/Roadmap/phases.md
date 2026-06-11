# CXSun / Versatile OS - Phase Map

## Build Layers Overview

| Layer | Phase | Name | Modules | Status |
|-------|-------|------|---------|--------|
| 0 | P0 | Core Principle | Architecture, safety, logs | Documented |
| 1 | P1 | Site Helper Agent | RAG, chat, read-only answers | Next |
| 2 | P2 | Site Operator Agent | Tool registry, CRUD tools | Planned |
| 3 | P3 | Workflow Agent | Tool chains, workflow state | Planned |
| 4 | P4 | Specialist Agents | Planner, Analytics | Planned |
| 5 | P5 | Agent Router | Routing, handoffs | Planned |
| 6 | P6 | Shared Memory | Preferences, summaries, history | Planned |
| 7 | P7 | Agent Ecosystem | Agent-to-agent collaboration | Planned |

## Layer Dependencies

```text
P0 Core Principle
  -> P1 Helper
  -> P2 Operator
  -> P3 Workflow
  -> P4 Planner + Analytics
  -> P5 Router
  -> P6 Memory
  -> P7 Ecosystem
```

## Entry Gates

| Layer | Must Have Before Starting |
|-------|--------------------------|
| P1 - Helper | Agent OS docs, model config shape, log table plan. |
| P2 - Operator | Helper endpoint stable, tool registry contract, `tool_executions` table. |
| P3 - Workflow | At least three safe Operator tools with tests/logging. |
| P4 - Specialists | Workflow contract and task/project data path. |
| P5 - Router | Two or more specialist agents with measurable `canHandle` scores. |
| P6 - Memory | Conversation/log storage and explicit memory write policy. |
| P7 - Ecosystem | Router, memory, workflow state, and observable handoffs. |

## Estimated Effort

| Layer | Duration |
|-------|----------|
| P1: Helper | 2-4 focused sessions |
| P2: Operator | 3-5 focused sessions |
| P3: Workflow | 3-5 focused sessions |
| P4: Planner + Analytics | 4-6 focused sessions |
| P5: Router | 2-4 focused sessions |
| P6: Memory | 2-4 focused sessions |
| P7: Ecosystem | Iterative after daily usage |

## P1 - Helper Breakdown

Goal: answer questions about Versatile/CXSun from trusted knowledge.

Core tasks:

- Add backend `agent-os` module.
- Add `conversations`, `agent_logs`, and `knowledge_documents`.
- Add configurable OpenRouter model client.
- Add RAG ingestion/search over ZRO, assist, site, and feature docs.
- Add Helper Agent prompt and chat API.
- Add minimal frontend chat UI.
- Add seed questions and manual verification script/checklist.

Definition of done:

```text
The user can ask "What is Versatile?", "How do I create a task?", and "Where are my tasks?"
and receive grounded answers without any data mutation.
```

## P2 - Operator Breakdown

Goal: execute safe actions through typed tools.

Core tasks:

- Add tool registry.
- Add task-manager tools.
- Add confirmation flow for deletes/destructive changes.
- Add tool execution persistence.
- Add permission checks by route family and tenant context.

Definition of done:

```text
The user can ask "Create a task called Verify GST invoices" and the agent creates it through
the task-manager service with a logged tool execution.
```
