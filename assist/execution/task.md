# Tasks

## Versatile Agent OS Documentation

- [x] Inspect repository structure and current app boundaries.
- [x] Read ZRO templates and assist architecture/product context.
- [x] Replace ZRO overview and guide with CXSun / Versatile OS direction.
- [x] Replace ZRO core vision and architecture with concrete Agent OS plan.
- [x] Add `ZRO/Vision/agent-os.md`.
- [x] Add Agent OS roadmap, phase map, shipped inventory, and checklist.
- [x] Add ZRO session log.
- [x] Add `assist/context/versatile-agent-os.md`.
- [x] Update assist README, product picture, and architecture context.

## Next Slice

- [x] Implement P1 Helper Agent backend module base.
- [x] Add `conversations`, `agent_logs`, and `knowledge_documents`.
- [x] Add mini Agent icon and tenant dashboard app entry.
- [x] Add Agent OS base frontend page.
- [x] Rename visible product surface to ZETRO.
- [x] Add switchable model config and selector.
- [x] Add universal ZETRO chat window shell.
- [x] Add base chat endpoint with conversation/log writes.
- [x] Add OpenRouter-compatible model client.
- [x] Configure free models first and premium models through env/API keys.
- [x] Connect ZETRO to the dedicated role-filtered `ZRO/ZETRO/docs` system.
- [x] Add ZETRO read-only public screen at `/zetro`.
- [x] Add adaptive markdown search and learn/index function.
- [x] Add API connection status and one-time OpenRouter key test endpoint.
- [x] Add ZETRO dashboard API panel and chat shortcut.
- [x] Add recommended updates to ZETRO surfaces.
- [x] Add encrypted provider key persistence for OpenRouter, OpenAI, Gemini, OpenCode Zen, and custom OpenAI-compatible providers.
- [x] Make ZETRO chat use the active saved provider connection.
- [x] Change provider tests to perform real chat/generateContent checks.
- [x] Refresh OpenRouter free model choices from the live model catalog and avoid stale discontinued `:free` slugs.
- [x] Make ZETRO dashboard status cards and multi-agent stack dynamic from backend status.
- [x] Polish ZETRO reply behavior and chat rendering for compact markdown answers.
- [x] Make the dashboard switchable model card interactive and persist default model changes.
- [x] Constrain ZETRO model dropdown height so it scrolls internally.
- [x] Add chat fallback when a selected free model is rate-limited or temporarily unavailable.
- [x] Add AI platform manager UI for OpenRouter, OpenAI/GPT, Gemini, OpenCode Zen, and custom providers.
- [x] Add optional env fallback keys for OpenAI/GPT, Gemini, OpenCode Zen, and custom providers.
- [x] Add ZETRO chat history memory with full-window history view, dated saved chats, load previous chat, new chat from history, clear current, and clear all.
- [x] Polish ZETRO chat box with adaptive glass UI, signature hero, rotating empty-state prompt, bottom model picker, and auto-scroll to newest messages.
- [x] Split ZETRO behavior into restricted user/super-admin audiences with hidden model/provider details for all non-super-admin roles and super-admin-only recommended updates.
- [x] Add legal/compliance/secret restriction behavior and dedicated policy docs.
- [x] Restrict ZETRO runtime search to the dedicated `ZRO/ZETRO` docs boundary.
- [x] Add tenant-aware read-only sales and purchase summary query tools.
- [x] Add super-admin query-insights review for repeated client questions and mapped intents.
- [x] Split the super-admin ZETRO base screen into focused pages for Base, Providers, Knowledge, Agents, Queries, and Updates.
- [x] Fix ZETRO fetch/learn flow errors by restoring backend startup, bounding tenant provisioning, and surfacing failed Learn/API payloads.
- [x] Expand approved read-only tenant query tools for customer balances, supplier balances, sales bill details, and purchase bill details.
- [ ] Verify with platform FAQ prompts after docs are indexed.
- [x] Verify a live provider response through the saved OpenRouter connection.
