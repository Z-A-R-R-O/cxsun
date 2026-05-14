# Coding Style And File Size Rules

## File Size Policy

1. Source files must not exceed 700 lines.
2. The preferred file size range is 500 lines or fewer.
3. Files between 500 and 700 lines are allowed only when the code remains cohesive, readable, and difficult to split without harming clarity.
4. Any file approaching 500 lines must be reviewed for extraction into smaller modules, helpers, components, or focused services.
5. Files over 700 lines must be split before the change is considered complete.
6. Generated files, lockfiles, build artifacts, schema snapshots, and vendor files are exempt from this rule.

## Readability Policy

1. Code must be clean, neat, and easy to scan.
2. Keep functions small and focused on one responsibility.
3. Prefer descriptive names over comments that explain unclear code.
4. Use comments only for non-obvious decisions, domain rules, or complex integration behavior.
5. Avoid deeply nested conditionals; extract guard clauses or small private helpers.
6. Keep imports organized and remove unused code immediately.
7. Keep public APIs explicit with clear types.
8. Avoid large mixed-purpose files that combine transport, application, domain, and infrastructure concerns.

## Formatting Policy

1. Follow the repository Prettier and ESLint configuration.
2. Keep related code grouped in a predictable order.
3. Use blank lines to separate logical sections, not to pad files.
4. Prefer readable object and function formatting over compressed cleverness.
5. Do not use dense one-line implementations when they reduce clarity.

## Refactoring Trigger

When a file reaches 500 lines, future edits must either:

- Keep the file below 700 lines and document why it remains cohesive.
- Split the file into smaller focused units.
- Move reusable logic into an appropriate package or module layer.
