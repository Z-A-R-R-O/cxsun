# Event-Driven Patterns

- Events describe facts that already happened.
- Event names must be stable and versionable.
- Handlers must be idempotent where practical.
- Publishing should happen after successful state changes.
- Future durable processing should use an outbox or queue adapter behind `EventBus`.
- Handlers should not rely on execution order unless the ordering is explicit.
