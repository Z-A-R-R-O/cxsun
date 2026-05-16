# Coding Rules

## General

- Use existing libraries and utilities. Do not add new dependencies unless necessary.
- Prefer editing existing files over creating new ones.
- Use TypeScript types properly. Avoid `any`.
- Components should be small and focused.
- Use async/await over raw promises.
- Handle errors gracefully. Do not silently swallow failures.

## File Size

- Source files must not exceed 700 lines.
- Preferred range is 500 lines or fewer.
- Files from 500 to 700 lines are allowed only when cohesive and hard to split without harming clarity.
- Any file approaching 500 lines must be reviewed for extraction into smaller modules.
- Files over 700 lines must be split before the change is complete.
- Generated files, lockfiles, build artifacts, and vendor files are exempt.

## Complexity

- Keep solutions simple and easy to reason about.
- If a function or module is getting complex, break it down.

## Readability

- Code must be clean, neat, and easy to scan.
- Keep functions small and focused on one responsibility.
- Prefer descriptive names over comments that explain unclear code.
- Use comments only for non-obvious decisions, domain rules, or complex integration behavior.
- Avoid deeply nested conditionals; extract guard clauses or small private helpers.
- Keep imports organized and remove unused code immediately.
- Keep public APIs explicit with clear types.
- Avoid large mixed-purpose files that combine transport, application, domain, and infrastructure concerns.

## Formatting

- Follow the repository's Prettier and ESLint configuration when present.
- Keep related code grouped in a predictable order.
- Use blank lines to separate logical sections, not to pad files.
- Prefer readable formatting over compressed cleverness.
- Do not use dense one-line implementations when they reduce clarity.

## Active Work Areas

- Put active backend work under `apps/server`.
- Put active frontend work under `apps/frontend`.
- Put shared framework-free code under `packages/shared`.
- Use `apps/cli` for workflow helpers.
- Treat `packages/web` and `packages/mobile` as placeholders unless the user explicitly asks to activate them.
- Treat `packages/desktop` as a minimal reserved Electron package until real desktop work is requested.

## Architecture

- Follow a modular monolith for the backend: one deployable server app with clear module boundaries.
- Follow Domain-Driven Design for business modules: each module represents a bounded context/domain.
- Use events or explicit public contracts for cross-module behavior.
- Do not import another module's internals directly.
- Keep `@cxsun/shared` limited to types, constants, and pure utilities.

## Database Identity

- New database tables must use `id INT AUTO_INCREMENT PRIMARY KEY` as the internal primary key.
- New database tables must also include `uuid CHAR(8) NOT NULL UNIQUE` as the public identifier.
- Internal code should use `id` for joins and foreign keys; API/frontend/public references should use `uuid`.
- Keep the current public UUID length at 8 characters. Plan a deliberate move to 16 characters when the product grows enough to need a larger public id space.

## Backend Module Structure

New or expanded business modules should follow this shape:

```
apps/server/src/modules/<module-name>/
├── domain/           # Entities, value objects, domain events
├── application/      # Use cases, application services, DTOs
├── infrastructure/   # Repositories, external adapters, database
│   └── database/
│       ├── migrations/
│       └── seeders/
├── interface/        # Controllers, resolvers, middleware
├── <module>.module.ts
└── index.ts          # Public API only
```

The existing `health` module has a few flat files from early bootstrap work. Do not use that as the pattern for larger business modules.
