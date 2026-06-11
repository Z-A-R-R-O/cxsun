# CXSun / Versatile OS - Strategic North Star

> One useful agent experience, many small specialized agents underneath.

## The Big Idea

CXSun is becoming a business operating system. Versatile Agent is the natural-language operating layer for that system.

The agent should help users:

- Understand the platform.
- Find the right page or workflow.
- Create projects and tasks.
- Build roadmaps and follow-ups.
- Run safe multi-step workflows.
- Read analytics and explain what changed.

It should not begin as a "Jarvis that does everything." The correct path is layered.

## Product Shape

```text
Public site
  -> tenant-aware platform knowledge
  -> Helper Agent

Tenant workspace
  -> tasks, projects, documents, sales, stock, mail, GST, integrations
  -> Operator and Workflow Agents

Admin and super-admin
  -> support, setup, tenant/domain/system operations
  -> Analytics and Operator Agents with stricter permissions
```

## Agent OS Principle

```text
User
  -> Agent Router
  -> Specialized Agents
  -> Tools
  -> Backend APIs
  -> Database
```

Not:

```text
User
  -> One Giant Agent
  -> Everything
```

Multi-agent wins here because each agent can have one job, one prompt shape, one safety policy, and one observable execution path.

## Modules Are Abilities

| Module | Ability |
|--------|---------|
| Helper Agent | Knowledge and explanation. |
| Operator Agent | Safe CRUD through tools. |
| Workflow Agent | Multi-step action chains. |
| Planner Agent | Goals to roadmap/milestones/tasks. |
| Analytics Agent | Data reading and explanation. |
| Agent Router | Agent selection and handoff. |
| Shared Memory | User/project/task/history context. |
| Tool Registry | Typed action contracts and safety. |

## Build Order

```text
P0: Core Principle
  -> Establish multi-agent architecture and logging requirements.

P1: Site Helper Agent
  -> Chat with platform knowledge through RAG. No automation.

P2: Site Operator Agent
  -> Create/update/delete records through typed backend tools.

P3: Workflow Agent
  -> Chain actions such as create project -> generate roadmap -> create tasks.

P4: Specialist Agents
  -> Add Planner and Analytics agents.

P5: Agent Router
  -> User sees one agent while internals route to specialists.

P6: Shared Memory
  -> Persist useful context across sessions and modules.

P7: Agent Ecosystem
  -> Agents communicate, hand off, log, and improve from usage data.
```

## V1 Product Promise

The first useful product is not automation. It is confidence:

```text
User asks anything about the platform
  -> Agent searches trusted platform knowledge
  -> Helper Agent answers clearly
  -> Conversation and logs are saved
```

When this works, add actions.

## Strategic Rule

Knowledge first. Tools second. Workflows third. Router after specialists exist.

## Success Looks Like

- A new user can ask "What is Versatile?" and get a grounded answer.
- A tenant user can ask "Where are my tasks?" and receive the right navigation and explanation.
- Later, the same user can say "Create a task for invoice GST verification" and the Operator Agent creates it through the task API.
- A workflow request creates a project, roadmap, and tasks with a clear summary.
- Every agent decision and tool execution is visible in logs.
