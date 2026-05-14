# cxnext Architecture

`cxnext` is a TypeScript monorepo for a scalable modular monolith platform.

## Runtime Shape

- Backend: one deployable NestJS service using Fastify.
- Frontend: Next.js App Router shell.
- Desktop: Electron wrapper around the frontend.
- Shared packages: reusable platform primitives only.

## Backend Architecture

The backend follows modular monolith rules. Future bounded contexts must be internally isolated and communicate through public contracts, application ports, or events.

Future modules must follow:

```text
domain/
  entities/
  value-objects/
  aggregates/
  events/
application/
  use-cases/
  services/
infrastructure/
  persistence/
  adapters/
interface/
  graphql/
  http/
```

## DDD Foundation

`@cxnext/core` owns reusable DDD primitives:

- `Entity`
- `AggregateRoot`
- `ValueObject`
- `DomainEvent`
- `BaseModule`
- `ModuleRegistry`

Domain code must stay framework-free.

## Event Foundation

`@cxnext/event` owns internal event contracts:

- `BaseEvent`
- `EventBus`
- `EventHandler`
- `InMemoryEventBus`

The in-memory implementation is the default adapter and can be replaced later by an outbox or queue-backed implementation without changing module contracts.

## Governance

Architecture rules live in `assist/`. AI agents and humans must follow the same governance files for module boundaries, code generation, file size, versioning, branching, and releases.
