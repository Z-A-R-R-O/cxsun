# Session Plan

**Date:** 2026-06-11  
**Version:** 1.0.91  
**Focus:** ZETRO base scaffold.

## Objective

Create the first ZETRO base without disturbing existing site/dashboard flows: a small dashboard icon, tenant app entry, backend status/chat module, switchable model metadata, universal chat window, platform database tables, and OpenRouter-compatible free-first model calls for the future Helper Agent.

## Architecture Boundary

- ZRO is the strategic source of truth for the Agent OS plan.
- Assist is the practical working guide for future coding agents.
- This session includes a small frontend/backend scaffold.
- The first implementation phase is Helper Agent with read-only RAG and logs.
- Operator, Workflow, Planner, Analytics, Router, and Memory come later.

## Current Slice

1. Add backend `agent-os` module base.
2. Add platform migration for `conversations`, `agent_logs`, and `knowledge_documents`.
3. Add `/api/v1/agent-os/status`.
4. Rename the visible product surface to `ZETRO`.
5. Add tenant dashboard `ZETRO` app entry.
6. Add mini Bot icon shortcut in the dashboard header.
7. Add base frontend ZETRO page.
8. Add universal ZETRO chat window with switchable model selector.
9. Connect OpenRouter-compatible chat calls with free models first and premium models configurable by env.
10. Update ZRO and assist task records.

## Verification

- `npm -w apps/server run typecheck`
- `npm -w apps/frontend run typecheck`

## Model Policy

- Free OpenRouter model IDs are exposed first from `ZETRO_FREE_MODELS`.
- Premium model IDs are exposed after free IDs from `ZETRO_PREMIUM_MODELS`.
- Both free and premium calls require `OPENROUTER_API_KEY`.
- ZETRO logs missing keys, provider failures, latency, model tier, and usage metadata in `agent_logs`.
