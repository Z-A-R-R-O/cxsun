# DDD Standards

- Entities have identity and lifecycle.
- Value objects are immutable and compared by value.
- Aggregates enforce consistency boundaries.
- Aggregate roots collect domain events.
- Domain services are allowed only for domain behavior that does not belong to one entity/value object.
- Application services/use cases orchestrate repositories, transactions, and event publication.
- Infrastructure implements persistence, messaging, and external adapters.
- Interface handlers translate transport input/output and should stay thin.
