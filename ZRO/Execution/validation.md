# CXSun / Versatile OS - Validation Plan

## Documentation-Only Changes

For docs-only work:

- Inspect changed Markdown files.
- Check for leftover non-template placeholders.
- Confirm `assist` and `ZRO` agree on the current direction.
- No TypeScript build is required when no source files changed.

## Runtime Smoke Tests

Run these before sharing an implementation build:

```powershell
npm run check
```

For targeted development:

```powershell
npm -w apps/server run typecheck
npm -w apps/frontend run typecheck
npm run build:active
```

Expected:

- Backend typecheck passes.
- Frontend typecheck passes.
- Active apps build into the root build flow.

## Agent OS P1 Validation

The first Helper Agent implementation must pass these manual prompts:

| Prompt | Expected |
|--------|----------|
| What is Versatile? | Explains the Agent OS direction using trusted docs. |
| How do I create a task? | Explains the task manager path and current capabilities. |
| Where are my tasks? | Points to tenant workspace task manager behavior. |
| Explain pricing/features. | Answers only from available knowledge or says it is not documented yet. |
| Create a task called GST follow-up. | Refuses or explains automation is not enabled in Helper phase. |

## Agent OS P2 Validation

Operator Agent is valid only when:

- Tool registry blocks unknown tool names.
- Tool input validates before execution.
- Tenant context is enforced.
- Destructive actions require confirmation.
- `tool_executions` records success and failure.
- Failed tool calls return a useful user summary and internal error log.

## Persistence Matrix

| Data | Backend | Status |
|------|---------|--------|
| Conversations | Master MariaDB | Planned |
| Agent logs | Master MariaDB | Planned |
| Knowledge documents | Master MariaDB | Planned |
| Tool executions | Master MariaDB | Planned for P2 |
| Tenant tasks | Tenant MariaDB through task-manager | Existing |

## V1 Freeze Criteria

Versatile Agent v1 ships when:

```text
Helper Agent answers the P1 validation prompts from trusted knowledge,
stores conversation and agent logs,
and performs no data mutation.
```

Run the P1 validation prompts at least three times across fresh sessions before moving to Operator Agent work.
