# ZETRO Agent OS

## Purpose

ZETRO Agent OS is the AI operating layer for CXSun. It sits above the platform and uses specialized agents to explain, operate, plan, automate, and analyze.

## Phase 0 - Core Principle

```text
User
  -> Agent Router
  -> Specialized Agents
  -> Site Actions / Database / APIs
```

Do not build one huge agent. Build agents with narrow jobs and a shared contract.

## MVP v1 - Site Helper Agent

Goal: user can ask anything about the platform.

Example questions:

- What is Versatile?
- How do I create a project?
- Where are my tasks?
- Explain pricing.
- Show features.
- Explain architecture.
- Website docs.
- FAQ.
- Knowledge base.

Flow:

```text
Question
  -> RAG search
  -> Helper Agent
  -> Answer with source/context
```

Scope:

- Read-only.
- Uses platform docs, site content, feature docs, `assist`, and curated knowledge chunks.
- No record mutation.
- Logs model, prompt category, retrieval chunks, answer status, and errors.

## MVP v2 - Site Operator Agent

Goal: agent can perform safe actions.

Examples:

- Create project.
- Create task.
- Delete task.
- Update profile.
- Add note.

Flow:

```text
User request
  -> Operator Agent
  -> Tool call
  -> Backend service/API
  -> Database
  -> Summary
```

Example tool call:

```json
{
  "tool": "create_project",
  "name": "MERIT"
}
```

Rules:

- Only registered tools are executable.
- Destructive tools require confirmation.
- Tool input must validate against schema.
- Tool execution must be logged.

## MVP v3 - Workflow Agent

Goal: agent can chain actions.

Example request:

```text
Create a startup project, add roadmap, create 5 tasks.
```

Flow:

```text
Create Project
  -> Generate Roadmap
  -> Create Tasks
  -> Return Summary
```

This becomes the first real automation layer.

## MVP v4 - Multi-Agent System

Introduce specialization:

| Agent | Job |
|-------|-----|
| Helper Agent | Platform knowledge. |
| Operator Agent | CRUD and safe actions. |
| Workflow Agent | Action chains and processes. |
| Planner Agent | Goals to roadmap, milestones, and tasks. |
| Analytics Agent | Reads data and explains revenue, users, projects, tasks, and productivity. |

## MVP v5 - Agent Router

The router is the most important component once multiple agents exist.

Example:

```text
User: Build a roadmap for my AI startup and create tasks.

Router
  -> Planner Agent
  -> Workflow Agent
  -> Operator Agent
```

The user sees one ZETRO assistant. Internally the system routes and logs each step.

## MVP v6 - ZETRO Agent Ecosystem

Agents communicate through structured handoffs:

```text
Planner
  <-> Workflow
  <-> Analytics
  <-> Operator
  <-> Helper
```

Shared memory:

- User profile.
- Projects.
- Tasks.
- Preferences.
- History.
- Prior summaries.

## Suggested Model Setup

| Role | Model Direction |
|------|-----------------|
| Router | Current free/reasoning-capable OpenRouter model when available. |
| Helper | Current free chat/instruct OpenRouter model, with saved premium providers optional. |
| Planner | Gemini/OpenRouter model when configured. |
| Workflow | Reasoning-capable OpenRouter/OpenCode/OpenAI-compatible model when configured. |
| Analytics | Qwen/OpenRouter/OpenCode/OpenAI-compatible model when configured. |
| Fallback | First currently available free OpenRouter text model. |

Implementation note: do not hardcode free model names. OpenRouter `:free` slugs change, so ZETRO must refresh them from the live model catalog and keep premium models configurable through saved API connections or env fallback. OpenCode Zen is available as an OpenAI-compatible provider for its `/chat/completions` model set, with editable model IDs in the API panel.

## Database Structure

Minimum agent infrastructure:

- `conversations`
- `agent_logs`
- `tool_executions`
- `agent_memories`
- `workflows`
- `knowledge_documents`

Existing and related tables/modules:

- `users` / `admin_users` / tenant users for actor identity.
- `tenants` and `tenant_domains` for tenant context.
- `task-manager` tables for tasks, campaigns, reminders, and office automation.
- Future project tables when the project module is added.

Do not skip `agent_logs`. They are required for debugging, cost visibility, safety reviews, and future improvement.

## Execution Order

1. Helper Agent: chat plus site/platform knowledge.
2. Operator Agent: perform actions through safe tools.
3. Workflow Agent: multi-step automation.
4. Planner Agent.
5. Analytics Agent.
6. Agent Router.
7. Shared Memory.
8. Full Multi-Agent Ecosystem.

## First Implementation Slice

Build only the Site Helper Agent:

- Backend conversation endpoint.
- OpenRouter model client abstraction.
- Switchable model selection.
- Knowledge document table and seed/index path.
- RAG search over platform docs and site content.
- Helper prompt with read-only behavior.
- Agent logs.
- Universal frontend chat window.

No automation in this slice.
