# CXSun / Versatile OS - Combined Master Plan

## Status Overview

| Plan | Items | Done | Progress |
|------|-------|------|----------|
| Agent OS strategy | 8 | 1 | 12% planned and documented |
| Helper Agent | 13 | 9 | 69% base scaffolded |
| Operator Agent | 7 | 0 | 0% planned |
| Workflow/Router/Memory | 10 | 0 | 0% planned |
| Combined | 38 | 10 | 26% |

## Active Phase: P1 - Site Helper Agent

P1 should create a useful read-only assistant before any automation is attempted.

```text
User question
  -> Knowledge retrieval
  -> Helper Agent
  -> Grounded answer
  -> Conversation and agent log
```

Priority: create a reliable knowledge/chat foundation that can be used daily.

## Direction Guardrail

Do not build broad autonomy before typed tools and logs exist. Do not let model output mutate data directly.

## Current Platform State

The existing system already has:

- Fastify backend under `apps/server`.
- React/Vite frontend under `apps/frontend`.
- Master MariaDB for platform data.
- Tenant MariaDB databases for tenant business data.
- Tenant context resolution through domain/JWT/header.
- Task manager module with task CRUD, campaigns, reminders, categories, tags, and settings.
- Public site and tenant-aware site infrastructure.
- Admin and super-admin route separation.

Agent OS should use these capabilities instead of duplicating them.

## Stage 1 - Helper Agent

Goal: answer platform questions from trusted knowledge.

| Task | Status |
|------|--------|
| Define `agent-os` backend module boundaries. | Done |
| Add `conversations`, `agent_logs`, and `knowledge_documents` migration. | Done |
| Add tenant dashboard app entry and mini header shortcut. | Done |
| Add base Agent OS page wired to status endpoint. | Done |
| Rename product surface to ZETRO. | Done |
| Add switchable model metadata and selector. | Done |
| Add universal chat window shell. | Done |
| Add configurable OpenRouter model client. | Planned |
| Add RAG ingestion/search for ZRO, assist, site docs, and feature docs. | Planned |
| Add read-only Helper Agent service. | Planned |
| Add chat endpoint and frontend chat surface. | Planned |
| Log retrieval, model, latency, and errors. | Planned |
| Verify with platform FAQ prompts. | Planned |

## Stage 2 - Operator Agent

Goal: perform safe CRUD through typed tools.

| Task | Status |
|------|--------|
| Create tool registry contract. | Planned |
| Add task tools: create, update status, add note/comment. | Planned |
| Add profile/project tools when project module exists. | Planned |
| Add confirmation flow for destructive actions. | Planned |
| Add `tool_executions` logging. | Planned |
| Add permission and tenant-scope checks per tool. | Planned |
| Verify through task-manager API. | Planned |

## Stage 3 - Workflow Agent

Goal: chain safe tools into a useful automation.

| Task | Status |
|------|--------|
| Add workflow plan/execution contract. | Planned |
| Add create project -> roadmap -> tasks workflow after project module exists. | Planned |
| Add rollback/partial failure summary rules. | Planned |
| Store workflow execution state. | Planned |

## Stage 4 - Planner, Analytics, Router, Memory

Goal: make the system feel like one Versatile Agent while keeping internals specialized.

| Task | Status |
|------|--------|
| Add Planner Agent for goals, milestones, and tasks. | Planned |
| Add Analytics Agent for task/productivity and platform metrics. | Planned |
| Add Agent Router selection and handoff logs. | Planned |
| Add shared memory write/read policy. | Planned |
| Add agent-to-agent handoff contract. | Planned |

## V1 Definition Of Done

ZETRO v1 is complete when this works reliably:

```text
User asks a platform question
  -> Helper Agent searches trusted knowledge
  -> Answer is clear and grounded
  -> Conversation and agent log are stored
```

When that works, stop expanding the Helper Agent and add typed Operator tools.

## What Not To Build Yet

- A single unrestricted "do everything" agent.
- Direct database writes from model output.
- Browser automation as the primary action layer.
- Cross-tenant analytics without explicit super-admin scope.
- Memory that stores secrets or unreviewed sensitive data.

## Decision Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-06-11 | Build Versatile Agent as Agent OS layers. | Specialized agents are safer, easier to debug, and easier to evolve. |
| 2026-06-11 | Start with Helper Agent only. | Knowledge/chat gives immediate user value without mutation risk. |
| 2026-06-11 | Require `agent_logs`. | Debugging and auditability will matter as soon as tools and workflows exist. |
