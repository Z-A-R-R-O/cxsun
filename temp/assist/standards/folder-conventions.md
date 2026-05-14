# Folder Conventions

```text
apps/
  server/
  frontend/
  desktop/
packages/
  core/
  event/
  db/
  validation/
  config/
  hooks/
  utils/
  types/
  ui/
assist/
  memory/
  rules/
  standards/
```

Future backend modules:

```text
apps/server/src/modules/<module-name>/
  domain/
  application/
  infrastructure/
  interface/
  database/
```

Strict backend module shape:

```text
apps/server/src/modules/<module-name>/
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
  database/
    migrations/
    seeder/
```

Strict frontend module shape:

```text
apps/frontend/features/<module-name>/
  domain/
  application/
  infrastructure/
  interface/
    pages/
```
