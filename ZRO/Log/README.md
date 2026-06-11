# ZRO Log

## Purpose

Each work session gets its own log file. Use this to track what changed, why, and what to do next.

## Log Format

Filename: `YYYY-MM-DD-HHmm.md`

Template:

```markdown
# Session: YYYY-MM-DD HH:MM

## What I did
- Feature: description
- Fix: description
- Refactor: description

## Status
- Task: In progress / Done / Blocked
- Blockers: None / [describe the blocker]

## Next
- Continue with...
- Need to fix...
```

## Start a New Session

```powershell
code ZRO/Log/$(Get-Date -Format "yyyy-MM-dd-HHmm").md
```
