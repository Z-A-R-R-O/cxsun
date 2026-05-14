# AI Agent Assist System

**Project version:** 1.0.13

This directory is the working guide for AI agents on `cxsun`. It records project rules, current architecture, session plans, task tracking, and release notes.

## Current Application Shape

The live workspace is a TypeScript monorepo with npm workspaces:

```
cxsun/
├── apps/
│   ├── server/      # Active Node.js/Fastify backend
│   ├── frontend/    # Active React + Vite frontend
│   └── cli/         # Local workflow helpers
├── packages/
│   ├── shared/      # Shared types, constants, and pure utilities
│   ├── web/         # Reserved web package
│   ├── desktop/     # Reserved Electron package
│   └── mobile/      # Reserved Expo package
└── assist/          # AI rules, context, templates, and session tracking
```

Root scripts use the active apps:

- `npm run dev` starts `apps/server` and `apps/frontend`.
- `npm run dev:server` starts only the backend.
- `npm run dev:frontend` starts only the frontend.
- `npm run check` runs the standard assist verification script.
- `npm run typecheck:active` typechecks all current workspaces.
- `npm run build:active` builds the active backend and frontend apps.

## Directory Structure

```
assist/
├── README.md          # This file, system overview
├── rules/             # AI behavior, coding, git, versioning, architecture, verification
├── templates/         # Templates for commits, pull requests, and server modules
├── scripts/           # Helper scripts for agent workflows
├── context/           # Long-term project context, decisions, and workspace map
├── agents/            # Role-specific agent configurations
├── execution/         # Current session plan and task checklist
└── documentation/     # Changelog, prompt review, and other docs
```

## Session Startup

At the start of each work session:

1. Read this file.
2. Read `assist/rules/`.
3. Read `assist/context/`.
4. Refresh `assist/execution/planning.md` and `assist/execution/task.md` for the current session.
5. Copy the exact user prompt into `assist/documentation/prompt-review.md` before starting the requested work.

## Key References

- `assist/context/workspaces.md` maps each workspace to its role and commands.
- `assist/rules/architecture.md` describes current app placement and module boundaries.
- `assist/rules/verification.md` describes required checks by change type.
- `assist/templates/server-module.md` gives the preferred backend module layout.

## Verification

Use targeted workspace commands while developing, then run the standard check before finalizing meaningful changes:

```
npm run check
```
