# Strict Module Structure Rule

This repository uses a strict modular monolith structure for both backend and frontend bounded contexts.

## Mandatory Backend Structure

Every backend bounded context must live under:

```text
apps/server/src/modules/<module-name>/
```

Each backend module must contain:

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
database/
  migrations/
  seeder/
```

Rules:

- Database migrations and seeders for a module must stay inside that module's `database/` folder.
- Domain files must remain framework-free.
- Application files may depend on domain and application ports only.
- Infrastructure files may implement application ports and adapt storage or external systems.
- Interface files must stay thin and call application use cases.
- Nest module registration must happen through the module's own `*.module.ts` file.
- Every backend module must be registered through the module registry.

## Mandatory Frontend Structure

Every frontend bounded context must live under:

```text
apps/frontend/features/<module-name>/
```

Each frontend module must contain:

```text
domain/
application/
infrastructure/
interface/
  pages/
```

Rules:

- `domain/` holds types, domain constants, and module concepts.
- `application/` holds orchestration, filtering, mapping, and module-level use-case style helpers.
- `infrastructure/` holds storage, network, adapters, and browser-only persistence details.
- `interface/pages/` holds React page components and UI transport composition.
- App routes under `apps/frontend/app/` must import tenant or future module pages from `features/<module-name>/interface/pages/`.

## Enforcement

- Do not place module business code directly in shared app route folders, root `src/`, or generic `features/` files.
- Do not create flat module files such as `tenant-data.ts` or `tenant-pages.tsx` at the module root once the strict structure exists.
- New bounded contexts must copy the same structure used by `tenants` unless a stricter rule replaces it in repository standards.
