# ZRO Tools

Shared utilities and automation notes for CXSun / Versatile OS development.

## Existing Root Commands

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start backend and frontend together. |
| `npm run dev:server` | Start only the Fastify backend. |
| `npm run dev:frontend` | Start only the Vite frontend. |
| `npm run check` | Run the standard assist verification script. |
| `npm run build:active` | Build active backend and frontend apps. |
| `npm run db:migrate` | Run database migrations through server CLI. |
| `npm run db:seed` | Run database seeders through server CLI. |

## Agent OS Tooling To Add Later

| Tool | Purpose | Phase |
|------|---------|-------|
| Knowledge indexer | Ingest ZRO, assist, site, and feature docs into `knowledge_documents`. | P1 |
| Prompt verifier | Run fixed Helper Agent validation prompts. | P1 |
| Tool registry inspector | List available tools, safety levels, and confirmation rules. | P2 |
| Agent log viewer | Inspect router decisions, model latency, and failures. | P2/P5 |

## Usage

Keep tools as scripts under the owning app or CLI workspace. Prefer:

```text
apps/cli/
apps/server/src/modules/agent-os/
```

Do not create ad hoc scripts that bypass app services for data mutation.
