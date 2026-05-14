# AI Agent Assist System

**Project version: 1.0.00**

A structured rules and context system to guide AI agents working on this project.

## Directory Structure

```
assist/
├── README.md          # This file — system overview
├── rules/             # AI behavior & coding rules (loaded by agent)
├── templates/         # Templates for common tasks (PRs, commits, issues)
├── scripts/           # Helper scripts for agent workflows
├── context/           # Project context & decision records
├── agents/            # Role-specific agent configurations
├── execution/         # Session planning & task tracking
└── documentation/     # CHANGELOG and other docs
```

## How It Works

1. **`rules/`** — Place `.md` rule files that the AI agent reads at session start. These define constraints, code style, operational guidelines, and architecture (`architecture.md`).
2. **`templates/`** — Standardized templates for git commits, pull requests, bug reports, etc.
3. **`scripts/`** — Shell scripts the agent can invoke for repeated tasks (lint, test, build, deploy).
4. **`context/`** — Long-term project memory: architecture decisions, API contracts, migration notes.
5. **`agents/`** — Per-role agent personalities (e.g., `architect.md`, `code-reviewer.md`, `tester.md`).
6. **`execution/`** — Session planning and task tracking with phased, numbered checkboxes. Erased and recreated each session start.
7. **`documentation/`** — Changelog and project documentation.

## Usage

Tell your AI agent to load the rules at the start of each session:

```
Please read assist/rules/ and assist/context/ before proceeding.
```

Or configure your AI tool to automatically include these files.
