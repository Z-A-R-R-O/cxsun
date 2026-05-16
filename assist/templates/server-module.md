# Server Module Template

Use this shape for new or expanded business modules under the correct `apps/server/src/modules` boundary.

Choose placement before creating files:

- Common tenant modules: `apps/server/src/modules/common/<group>/<module>/`
- Standalone master modules: `apps/server/src/modules/master/<module>/`
- CRM/support modules: `apps/server/src/modules/crm/<module>/`
- Entry/transaction modules: `apps/server/src/modules/entries/<module>/`
- Foundation engines/registries: `apps/server/src/modules/foundation/<module>/`

Do not create new business modules directly at `apps/server/src/modules/<module-name>/` unless the architecture docs explicitly add a new top-level module group.

## Directory Layout

```
apps/server/src/modules/<group-or-boundary>/<module-name>/
├── domain/
│   ├── events/
│   └── <entity-or-value-object>.ts
├── application/
│   ├── dto/
│   └── <use-case>.ts
├── infrastructure/
│   └── database/
│       ├── migrations/
│       └── seeders/
├── interface/
│   └── <module-name>.controller.ts
├── <module-name>.module.ts
└── index.ts
```

## Placement Guide

- `domain/`: business entities, value objects, policies, and domain events.
- `application/`: use cases, DTOs, orchestration, and application services.
- `infrastructure/`: repositories, database adapters, external integrations, migrations, and seeders.
- `interface/`: HTTP controllers, WebSocket handlers, middleware, guards, and request/response adapters.
- `<module-name>.module.ts`: framework module registration.
- `index.ts`: public API only. Do not export internals that other modules should not consume.

## Rules

- Do not import another module's internals.
- Use public exports, application contracts, or events for cross-module behavior.
- Keep controllers thin. Put business behavior in application/domain code.
- Keep infrastructure code out of domain and application layers.
- Keep public HTTP routes stable when moving internal module folders.
- For tenant-owned modules, resolve access and database through `TenantContextService`.
- For every application-owned table, keep integer auto-increment `id` as the primary key and an additional unique 8-character public `uuid`:

```sql
id INT AUTO_INCREMENT PRIMARY KEY,
uuid CHAR(8) NOT NULL UNIQUE
```

- Use `id` internally for joins and persistence. Use `uuid` in APIs, URLs, UI state, and other public references.
- Keep `uuid` at 8 characters for now; move to 16 characters later only through a planned migration.
