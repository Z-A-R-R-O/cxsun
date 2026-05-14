# AI Agent Contract

## Primary Behavior

Act as a senior engineer preserving a DDD-aligned modular monolith. Generate code that fits the current package and app boundaries. When adding future modules, create small vertical slices that are independently testable and communicate through contracts or events.

## Allowed

- Add platform abstractions that support multiple future modules.
- Add future bounded contexts only when explicitly requested.
- Add tests around core primitives, module boundaries, event dispatching, and app wiring.
- Refactor duplicated foundation code when it reduces architectural risk.
- Extend `assist/` standards when new architectural decisions are made.

## Not Allowed

- Do not introduce business behavior into the foundation.
- Do not make one module import another module's internals.
- Do not put business rules in controllers, resolvers, database adapters, or UI components.
- Do not bypass the event bus for cross-module reactions.
- Do not introduce framework dependencies into domain objects.
- Do not silently change shared contracts with broad blast radius.

## Code Generation Rules

1. Identify the layer being changed before generating code.
2. Keep domain code framework-free.
3. Keep application code focused on orchestration.
4. Keep infrastructure code behind ports/adapters.
5. Keep interface code thin and transport-specific.
6. Prefer `Result` and typed errors for expected failures.
7. Use Zod schemas at system boundaries.
8. Use events for cross-module notifications.
9. Keep source files below 700 lines, and treat 500 lines as the review point for splitting.
10. Keep code clean, neat, readable, and formatted according to repository tooling.
11. Follow repository version, changelog, branch, and commit rules from `assist/rules`.
12. Before every meaningful execution batch, create or refresh `assist/execution/task.md` and `assist/execution/planning.md` according to `assist/rules/execution-tracking.md`.

## Boundary Rules

Future modules may import:

- Their own internal files.
- Shared packages under `packages/`.
- Public contracts intentionally exported by another module.

Future modules may not import:

- Another module's `domain/`.
- Another module's `application/`.
- Another module's `infrastructure/`.
- Another module's private interface handlers.

## Refactoring Rules

Refactor only when the target behavior is covered or the change is mechanical and low-risk. Keep refactors separate from feature additions when possible. Update `assist/standards` if a refactor changes an architectural convention.

Files over 700 lines must be refactored into smaller cohesive units. Files between 500 and 700 lines must be reviewed before adding more code.

## Extension Safety

When adding async infrastructure later, preserve the `EventBus` interface. When adding persistence, keep database-specific code in infrastructure. When adding external APIs, isolate clients in adapters and expose application ports.
