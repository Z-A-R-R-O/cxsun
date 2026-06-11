# CXSun / Versatile OS - Workflow

## The Cycle

```text
Read ZRO -> Read assist context -> Pick checklist item -> Build -> Verify -> Log -> Update ZRO
```

## Step By Step

### 1. Read The Plan

```powershell
Get-Content ZRO\Roadmap\masterplan.md
Get-Content ZRO\Vision\agent-os.md
```

Check:

- Current phase.
- Guardrails.
- Next unchecked task.

### 2. Read Assist Context

```powershell
Get-Content assist\README.md
Get-Content assist\context\architecture.md
Get-Content assist\context\versatile-agent-os.md
```

Assist records the current app structure and module boundaries. ZRO records the strategic direction.

### 3. Pick A Task

```powershell
Get-Content ZRO\Execution\checklists\agent-os-checklist.md
```

Only start automation tasks after Helper Agent and typed tool registry tasks are complete.

### 4. Build

Use existing structure:

- Backend: `apps/server/src/modules/agent-os`.
- Frontend: `apps/frontend/src/features/agent-os`.
- Shared framework-free types, if needed: `packages/shared/src`.

### 5. Verify

For backend changes:

```powershell
npm -w apps/server run typecheck
```

For frontend changes:

```powershell
npm -w apps/frontend run typecheck
```

For meaningful cross-app changes:

```powershell
npm run check
```

### 6. Log

Create:

```text
ZRO/Log/YYYY-MM-DD-HHmm.md
```

Include:

- Prompt or objective.
- Files/modules touched.
- Verification run.
- What remains next.

### 7. Update ZRO

Update these when relevant:

- `ZRO/Roadmap/masterplan.md`
- `ZRO/Roadmap/phases.md`
- `ZRO/Roadmap/shipped.md`
- `ZRO/Execution/checklists/agent-os-checklist.md`
- `ZRO/Vision/agent-os.md`

ZRO must reflect reality before committing.
