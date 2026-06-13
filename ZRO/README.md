# CXSun / ZETRO OS - ZRO

> Build the operating layer in small useful agent layers. Do not start with one giant "does everything" assistant.

## What ZRO Is

`ZRO/` is the product and execution source of truth for the ZETRO direction inside CXSun.

CXSun is already a multi-tenant business platform with a Fastify API, React/Vite frontend, MariaDB master database, tenant-isolated MariaDB databases, task manager, site, auth, company, common, master, entries, mail, GST, stock, auditor, and integration modules.

The new direction is to add an Agent OS above that platform:

```text
User
  -> Agent Router
  -> Specialized Agents
  -> Site Actions / Backend APIs / Database
```

The product should feel like one ZETRO assistant to the user, but internally it must stay modular.

## Directory Structure

```text
ZRO/
  README.md
  GUIDE.md
  Core/
    vision.md
    architecture.md
    principles.md
  Vision/
    master.md
    agent-os.md
  Roadmap/
    masterplan.md
    phases.md
    shipped.md
  Execution/
    workflow.md
    validation.md
    release.md
    conventions.md
    checklists/
      agent-os-checklist.md
  Log/
    README.md
    YYYY-MM-DD-HHmm.md
  ZETRO/
    README.md
    docs/
      user/
      admin/
      policy/
      system/
  Tools/
    README.md
```

## Current Priority

Build the agent system in this order:

1. Site Helper Agent: chat + platform knowledge through RAG.
2. Site Operator Agent: safe CRUD through typed backend tool calls.
3. Workflow Agent: multi-step actions such as project plus roadmap plus tasks.
4. Planner Agent: turns broad goals into milestones and tasks.
5. Analytics Agent: reads data and explains patterns.
6. Agent Router: selects and chains specialized agents.
7. Shared Memory: user profile, projects, tasks, preferences, history.
8. Multi-Agent Ecosystem: agents communicate through logged, observable handoffs.

## Current Status

| Plan | Status | Notes |
|------|--------|-------|
| Platform foundation | Live | Existing multi-tenant SaaS/ERP platform with task and site modules. |
| ZETRO OS strategy | Planned | Architecture documented in `ZRO/Vision/agent-os.md`. |
| Dedicated ZETRO docs | Live | Role-filtered docs live in `ZRO/ZETRO/docs`. |
| Helper Agent | Active | Read-only chat with user/admin behavior split. No automation in this slice. |
| Operator Agent | Planned | Depends on typed tool registry and API action contracts. |
| Workflow/Planner/Analytics | Planned | Depends on stable operator tools and logs. |

## Build Layers

| Layer | Phase | What It Enables |
|-------|-------|-----------------|
| Principle | P0 | Multi-agent architecture and safety boundaries. |
| Helper | P1 | User can ask about the platform, docs, pricing, features, and workflows. |
| Operator | P2 | Agent can create/update/delete records through backend APIs. |
| Workflow | P3 | Agent can chain several safe actions into one outcome. |
| Specialist Agents | P4 | Helper, Operator, Workflow, Planner, and Analytics agents. |
| Router | P5 | One user-facing agent backed by internal routing. |
| Memory | P6 | Shared context across conversations and modules. |
| Ecosystem | P7 | Agent-to-agent collaboration with durable logs and tool execution history. |

## Workflow

```text
Read ZRO -> Pick checklist item -> Read assist context -> Build -> Verify -> Log -> Update ZRO
```

ZRO must reflect reality. If code changes agent behavior, update the related roadmap, checklist, and vision/spec files in the same work session.

## Strategic Documents

| Document | Purpose |
|----------|---------|
| `ZRO/Vision/master.md` | Full strategic north star. |
| `ZRO/Vision/agent-os.md` | Concrete Agent OS architecture and phase plan. |
| `ZRO/ZETRO/README.md` | Dedicated runtime docs boundary for user/admin/policy/system ZETRO behavior. |
| `ZRO/Roadmap/masterplan.md` | Active status, next tasks, and guardrails. |
| `ZRO/Roadmap/phases.md` | Phase gates and dependencies. |
| `ZRO/Execution/checklists/agent-os-checklist.md` | Implementation checklist. |
| `assist/context/versatile-agent-os.md` | Practical context for future coding agents. |
