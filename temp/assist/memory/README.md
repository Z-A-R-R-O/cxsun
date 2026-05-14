# Memory Layer

The memory layer stores architectural context for AI agents and future automation. It is intentionally abstract so storage can begin as files and later move to a database.

## Short-Term Memory

Short-term memory captures active task context:

- Current architectural decision.
- Files touched during a task.
- Temporary assumptions.
- Follow-up checks.

Suggested storage: local markdown or JSON files ignored by git when task-specific.

## Long-Term Memory

Long-term memory captures durable repository knowledge:

- Accepted architectural decisions.
- Module ownership.
- Cross-cutting conventions.
- Deprecated patterns.

Suggested storage: committed markdown under `assist/`, later mirrored into a database or vector store.
