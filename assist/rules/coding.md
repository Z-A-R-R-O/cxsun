# Coding Rules

## General

- Use existing libraries and utilities — don't add new dependencies unless necessary.
- Prefer editing existing files over creating new ones.
- Use TypeScript types properly — avoid `any`.
- Components should be small and focused (single responsibility).
- Use async/await over raw promises.
- Handle errors gracefully — no silent swallows.

## File Size

- Source files must not exceed 700 lines.
- Preferred range is 500 lines or fewer.
- Files 500–700 lines are allowed only when cohesive and hard to split without harming clarity.
- Any file approaching 500 lines must be reviewed for extraction into smaller modules.
- Files over 700 lines must be split before the change is complete.
- Generated files, lockfiles, build artifacts, and vendor files are exempt.

## Complexity

- Keep it simple. Do not overthink or over-engineer solutions.
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

- Follow the repository's Prettier and ESLint configuration.
- Keep related code grouped in a predictable order.
- Use blank lines to separate logical sections, not to pad files.
- Prefer readable formatting over compressed cleverness.
- Do not use dense one-line implementations when they reduce clarity.

## Refactoring Trigger

When a file reaches 500 lines, future edits must either:

- Keep the file below 700 lines and document why it remains cohesive.
- Split the file into smaller focused units.
- Move reusable logic into an appropriate module layer.

## Architecture

- Follow **Modular Monolithic** structure — single deployable unit with clear module boundaries.
- Follow **Domain-Driven Design (DDD)** — each module represents a bounded context/domain.
- Follow **Event-Driven** communication between modules — use events, not direct cross-module imports.

## Module Structure

Each module must follow this shape:

```
modules/<module-name>/
├── domain/           # Entities, value objects, domain events
├── application/      # Use cases, application services, DTOs
├── infrastructure/   # Repositories, external adapters, database
│   └── database/
│       ├── migrations/  # Database migrations
│       └── seeders/     # Database seeders
├── interface/        # Controllers, resolvers, middleware
└── index.ts          # Public API — only export what others may consume
```

Modules communicate exclusively through events. No direct imports between modules.
