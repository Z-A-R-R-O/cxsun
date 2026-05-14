# Branching And Commits

## Branching

1. Use short-lived branches scoped to one coherent change.
2. Prefer names such as `feature/billing-voucher-core`, `refactor/core-ownership-map`, or `docs/assist-consolidation`.
3. Do not mix unrelated refactors with functional changes unless required for safety.
4. Keep reference numbers in commit subjects and changelog entries, not in branch names.

## Commit Discipline

1. Keep commits reviewable and logically atomic.
2. Pair code changes with required docs updates in the same branch.
3. Mention affected ownership boundaries where useful: framework, core, ecommerce, billing, task, or site.
4. Start every commit subject with a reference such as `#10`.
5. Use the commit subject format `#<ref> <type>(<scope>): <summary>` or `#<ref> <type>: <summary>`.
6. Every meaningful batch must be tracked in `assist/execution/task.md` and `assist/execution/planning.md` before implementation begins.
7. Keep `assist/execution/task.md`, `assist/execution/planning.md`, and `assist/documentation/CHANGELOG.md` aligned to the same active reference number when release tracking is active.

## Before Review

1. Ensure the active task and plan files are current when the batch is tracked there.
2. Ensure validation is run or the gap is documented.
3. Ensure `assist/documentation/ARCHITECTURE.md` and `assist/documentation/CHANGELOG.md` are updated when required.
4. Ensure the working tree does not contain unrelated accidental changes.
