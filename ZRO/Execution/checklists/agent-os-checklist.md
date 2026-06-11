# Agent OS Checklist

## P0 - Documentation And Direction

- [x] Define multi-agent principle.
- [x] Record execution order in ZRO.
- [x] Add dedicated Agent OS vision/spec.
- [x] Add assist context for future coding agents.
- [ ] Review the plan after first Helper Agent implementation.

## P1 - Site Helper Agent

- [x] Create `apps/server/src/modules/agent-os`.
- [x] Add migration for `conversations`, `agent_logs`, and `knowledge_documents`.
- [x] Register the migration in platform modules.
- [x] Add tenant dashboard Agent OS app entry.
- [x] Add mini Agent icon shortcut in the dashboard header.
- [x] Add base Agent OS frontend page wired to backend status.
- [x] Rename the product surface to ZETRO.
- [x] Add model configuration keys to `.env.sample`.
- [x] Add switchable model metadata to backend status.
- [x] Add universal ZETRO chat window shell.
- [x] Add `POST /api/v1/agent-os/chat` base endpoint.
- [x] Implement OpenRouter-compatible model client abstraction.
- [x] Put free model IDs first and make premium model IDs API-configurable.
- [ ] Implement knowledge ingestion for ZRO, assist, site, and feature docs.
- [ ] Implement simple RAG search.
- [x] Implement first read-only Helper Agent prompt/service.
- [x] Persist base conversations and agent logs.
- [x] Add frontend `features/agent-os` chat surface.
- [x] Add missing-key manual verification message in the chat surface.
- [x] Connect ZETRO read/search to existing ZRO and assist markdown sources.
- [x] Add adaptive learn endpoint to index existing markdown into `knowledge_documents`.
- [x] Add public `/zetro` read-only screen.
- [x] Add API connection status and one-time test endpoints.
- [x] Add ZETRO dashboard API connection panel.
- [x] Add chat shortcut to the API connection panel.
- [x] Add recommended update list to ZETRO surfaces.
- [x] Persist encrypted provider API keys for OpenRouter, OpenAI, Gemini, and custom OpenAI-compatible providers.
- [x] Route ZETRO chat through the active saved provider before env fallback.
- [x] Make API tests perform a real tiny chat/generateContent call.
- [ ] Verify live provider response after `OPENROUTER_API_KEY` is present.

## P2 - Operator Agent

- [ ] Add tool registry service.
- [ ] Add tool execution persistence.
- [ ] Add task-manager create task tool.
- [ ] Add task-manager update status tool.
- [ ] Add task-manager add comment/note tool.
- [ ] Add confirmation contract for delete/destructive tools.
- [ ] Add tenant and actor permission checks per tool.
- [ ] Add frontend confirmation UI.

## P3 - Workflow Agent

- [ ] Add workflow execution contract.
- [ ] Add workflow persistence.
- [ ] Add create roadmap and tasks workflow after project support exists.
- [ ] Add partial failure summaries.
- [ ] Add workflow logs to conversation timeline.

## P4 - Planner And Analytics

- [ ] Add Planner Agent for goal decomposition.
- [ ] Add Analytics Agent read models for tasks/productivity.
- [ ] Add agent-specific prompts and model config.
- [ ] Add test prompts for planner and analytics behavior.

## P5 - Router

- [ ] Add `canHandle` scoring for each agent.
- [ ] Add router decision logging.
- [ ] Add multi-agent handoff summary.
- [ ] Route ambiguous requests to Helper before taking action.

## P6 - Shared Memory

- [ ] Add memory schema and retention policy.
- [ ] Add explicit memory write rules.
- [ ] Add memory read filters by tenant/user/surface.
- [ ] Add memory delete/export path for user control.

## P7 - Ecosystem

- [ ] Add agent-to-agent handoff contract.
- [ ] Add workflow replay/debug view.
- [ ] Add cost and latency dashboard.
- [ ] Add feedback loop for bad answers and failed tools.
