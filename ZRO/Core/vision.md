# CXSun / Versatile OS - Core Vision

## The Big Idea

CXSun becomes a business operating platform with an AI operating layer on top. The agent layer should help users understand the platform, operate records, plan work, automate workflows, and read analytics without breaking tenant isolation or hiding important actions.

## The Problem

The platform already has many business modules: site content, tenants, domains, companies, contacts, products, orders, sales, purchase, stock, mail, GST, auditor tools, Frappe/TConnect/Tally integrations, and task management. As the system grows, users need a simple way to ask, act, plan, and review without learning every screen first.

## The Goal

Build a Versatile Agent that feels like one assistant but is implemented as small specialized agents:

```text
User
  -> Agent Router
  -> Helper / Operator / Workflow / Planner / Analytics
  -> Backend APIs / RAG / Database
  -> Response, summary, and logs
```

## Product Structure

```text
CXSun / Versatile OS
  Public site and tenant-aware storefront
  Tenant business workspace
  Admin support desk
  Super-admin orchestration
  Task and workflow system
  Agent OS
    Helper Agent
    Operator Agent
    Workflow Agent
    Planner Agent
    Analytics Agent
    Router
    Shared Memory
```

## Agent Modules

| Agent | Purpose |
|-------|---------|
| Helper Agent | Answers questions about the platform, docs, pricing, features, workflows, and FAQs. |
| Operator Agent | Performs safe CRUD actions through typed backend tools. |
| Workflow Agent | Chains multiple actions such as project creation, roadmap generation, and task creation. |
| Planner Agent | Breaks large goals into roadmaps, milestones, and tasks. |
| Analytics Agent | Reads platform/tenant data and explains revenue, users, projects, tasks, and productivity. |
| Agent Router | Chooses the right agent or sequence of agents for a user request. |
| Shared Memory | Stores user preferences, active projects, conversation context, and useful history. |
| Tool Registry | Defines allowed actions, required confirmation, input schema, and audit logging. |

## Core Philosophy

- Multi-agent first, not one giant agent.
- Knowledge before automation.
- Typed tools before broad autonomy.
- Confirm destructive or sensitive actions.
- Every agent action must be logged.
- Tenant boundaries are security boundaries.
- The UI may look like one AI, but the backend should stay modular and observable.

## Success Metrics

- Users can ask platform questions and receive grounded answers.
- Users can create and update projects/tasks through safe tool calls.
- Workflow actions produce clear summaries and durable logs.
- Agent mistakes are debuggable through `agent_logs` and `tool_executions`.
- Tenant data is never crossed between tenants.
