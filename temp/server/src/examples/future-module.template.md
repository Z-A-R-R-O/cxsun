# Future Module Template

Every bounded context added under `apps/server/src/modules/<module-name>` must keep this shape:

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

Modules communicate through public contracts, application ports, or domain events. Direct imports from another module's `domain`, `application`, or `infrastructure` internals are not allowed.
