# CXSun / Versatile OS - Conventions

## Naming

### Files

| Type | Convention | Example |
|------|------------|---------|
| Pages | kebab-case | `agent-chat-page.tsx` |
| Components | PascalCase | `AgentChatPanel.tsx` |
| Hooks | camelCase, `use` prefix | `useAgentConversation.ts` |
| Services | kebab-case file, PascalCase class | `helper-agent.service.ts` |
| Repositories | kebab-case file, PascalCase class | `agent-log.repository.ts` |
| Types | kebab-case file | `agent.types.ts` |
| Tests | `.test.` suffix | `helper-agent.service.test.ts` |

### Directories

- Use kebab-case.
- Group by feature/domain ownership.
- Keep Agent OS under `apps/server/src/modules/agent-os` and `apps/frontend/src/features/agent-os`.

## Commits

Follow the repo's existing commit style when the user asks for a commit. Keep unrelated user changes out of the commit.

## Imports

```typescript
import { z } from 'zod'

import type { TenantRequestHeaders } from '../../core/tenant/tenant-context.service.js'

import type { AgentInput } from './domain/agent.types.js'
```

## Services

```typescript
export interface AgentModelClient {
  complete(input: ModelCompletionInput): Promise<ModelCompletionResult>
}

export class HelperAgentService {
  constructor(private readonly modelClient: AgentModelClient) {}

  async answer(input: AgentInput): Promise<AgentResult> {
    // Retrieve knowledge, ask the model, and log the result.
  }
}
```

## Database

- Use Kysely migrations matching existing module patterns.
- Platform-wide agent tables start in the master database.
- Tenant business data stays in tenant databases.
- Use internal numeric IDs plus public UUIDs where records are exposed to APIs.
- Store JSON as strings only where the existing schema pattern requires it.

## API Design

- Use `/api/v1/agent-os/*` for Agent OS endpoints.
- Keep read-only Helper endpoints separate from action endpoints.
- Include actor and tenant context in service calls.
- Return user-safe errors; log detailed errors internally.
- Keep public response shapes stable.

## Tool Design

- Every tool has a name, description, input schema, safety level, and executor.
- Tools call services; models do not call repositories directly.
- Unknown tools are blocked.
- Destructive tools require confirmation.
- All tool calls write `tool_executions`.

## Documentation

- Update `ZRO/Vision/agent-os.md` when the architecture changes.
- Update `ZRO/Roadmap/masterplan.md` when phase status changes.
- Update `ZRO/Execution/checklists/agent-os-checklist.md` as tasks complete.
- Update `assist/context/versatile-agent-os.md` when implementation guidance changes.
