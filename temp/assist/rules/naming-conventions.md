# Naming Conventions

- Packages use `@cxnext/<name>`.
- Backend modules use kebab-case folders and PascalCase Nest modules.
- Domain entities, value objects, and aggregates use PascalCase.
- Domain events use past-tense names, for example `SomethingCompleted`.
- Event names use dot notation, for example `context.something.completed`.
- Use cases use verb-first names, for example `CreateSomethingUseCase`.
- Ports end with `Port`; adapters end with `Adapter`.
