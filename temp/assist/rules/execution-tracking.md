# Execution Tracking

Execution tracking is a strict repository rule. Every meaningful batch must begin with a current task file and a current planning file before implementation starts.

## Required Files

1. `assist/execution/task.md` records the active reference, task title, phases, and checkbox progress.
2. `assist/execution/planning.md` records goal, scope, constraints, planned validation, implementation notes, validation results, and residual risk.
3. `assist/documentation/CHANGELOG.md` records completed release history for top-level release alignment.

## Start Rule

Before changing code, changing docs, running validation for a batch, or preparing a commit:

1. Choose the next active reference number.
2. Create or refresh `assist/execution/task.md` with one active task entry.
3. Create or refresh `assist/execution/planning.md` with the implementation plan.
4. Break the work into clear phases.
5. Use unchecked checkboxes for incomplete work.
6. Keep the plan specific to the current project and do not copy stale sample domain details from other repositories.

## Completion Rule

When the batch is complete:

1. Mark completed task phases and checks in `assist/execution/task.md`.
2. Update `assist/execution/planning.md` with implemented scope, validation, and residual risk.
3. Update `assist/documentation/CHANGELOG.md` when release tracking is active.
4. Keep only active or still-relevant execution details in execution files after completed work is preserved in the changelog.

## Format Rule

Task entries must use this shape:

```md
# Task

Active reference: `#8`

## Active

- [ ] `#8` Short task title
  - [ ] Phase 1: phase name
    - [ ] 1.1 concrete step
  - [ ] Phase 2: validation
    - [ ] 2.1 run or document validation
```

Planning entries must use this shape:

```md
# Planning

Active reference: `#8`

## Active

- `#8` Short task title
  - Goal:
    - describe the outcome
  - Scope:
    - describe included work
  - Constraints:
    - describe boundaries
  - Planned validation:
    - describe validation
  - Implemented:
    - fill during or after implementation
  - Validation:
    - fill after validation
  - Residual risk:
    - document any remaining risk or `none identified`
```

## Cleanup Rule

Do not allow execution files to become a historical archive. Historical details belong in `assist/documentation/CHANGELOG.md`; execution files are for the current active batch and still-relevant near-term work only.
