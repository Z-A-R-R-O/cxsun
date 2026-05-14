# Sync Execution Guide

Use this guide when planning or implementing data synchronization in `cxnext`.

The goal is to fit sync work into the current repository shape:

- NestJS backend under `apps/server`
- Next.js frontend under `apps/frontend`
- Electron desktop wrapper under `apps/desktop`
- modular monolith boundaries
- DDD application flow
- event-driven cross-module integration
- versioned browser APIs under `/api/v1`

This file replaces the generic `modules/sync/core|queue|transport|storage` prompt. That layout does not match this repo.

## Runtime Position

- `apps/server` owns sync orchestration, persistence, background execution, retry rules, conflict handling, and remote transport.
- `apps/frontend` owns operator-facing status and control screens only.
- `apps/desktop` may provide device/runtime metadata for offline installations, but it must not own sync business rules.
- Remote sync peers are other `cxnext` server deployments, or compatible services that implement the same `/api/v1/sync` contract.

Offline clients do not sync browser-to-browser.

## Required Backend Placement

Create sync as one bounded context:

```text
apps/server/src/modules/sync/
  sync.definition.ts
  sync.module.ts
  sync.registry.ts
  domain/
    entities/
    value-objects/
    aggregates/
    events/
  application/
    use-cases/
    services/
  infrastructure/
    persistence/
    adapters/
  interface/
    http/
    graphql/
  database/
    migrations/
    seeder/
```

Do not create a parallel backend tree such as:

```text
modules/sync/core
modules/sync/queue
modules/sync/transport
modules/sync/storage
```

If sync needs queue, transport, or storage concepts, place them inside the standard DDD layers above.

## Bounded Context Rules

`sync` is a backend module, not a cross-cutting folder for arbitrary helpers.

- Register it through the module registry like the existing backend modules.
- Give it a stable bounded context such as `platform` or `operations`.
- Keep domain code framework-free.
- Keep interface handlers thin.
- Keep infrastructure behind application ports.

Do not hide sync logic inside `core/`, `media/`, `system-update`, or frontend route files.

## Recommended Sync Domain Model

Keep the sync domain focused on synchronization state, not on business records themselves.

Good candidates:

- `SyncJob`
- `SyncDevice`
- `SyncCheckpoint`
- `SyncConflict`
- `SyncBatch`

Good value objects:

- `SyncDirection`
- `SyncCursor`
- `SyncJobStatus`
- `SyncConflictStrategy`
- `SoftwareId`

Good events:

- `sync.job-enqueued`
- `sync.job-completed`
- `sync.job-failed`
- `sync.pull-applied`
- `sync.conflict-detected`
- `sync.conflict-resolved`

Business payloads should stay opaque envelopes inside sync. Do not import another module's aggregate or entity into the sync domain.

## Application Layer Shape

Use cases should orchestrate sync behavior the same way other modules orchestrate business behavior.

Typical use cases:

- `RegisterSyncDeviceUseCase`
- `EnqueueSyncChangeUseCase`
- `ProcessSyncQueueUseCase`
- `PullRemoteChangesUseCase`
- `ResolveSyncConflictUseCase`
- `RetrySyncJobUseCase`
- `GetSyncStatusUseCase`

Application ports should follow repo naming rules and end with `Port`.

Typical ports:

- `SyncJobRepositoryPort`
- `SyncCheckpointRepositoryPort`
- `SyncConflictRepositoryPort`
- `SyncTransportPort`
- `SyncConnectivityPort`
- `SyncParticipantPort`

If a queue worker or scheduler is needed, keep the orchestration in a use case and let infrastructure trigger it.

## Event Pattern

The default integration model is:

```text
business module write
  -> domain event
  -> module-local domain event publisher
  -> shared EventBus
  -> sync event handler
  -> EnqueueSyncChangeUseCase
  -> sync persistence
```

Rules:

- Business modules publish past-tense events after successful state change.
- Sync listens to those events and creates durable sync jobs.
- Business modules must not call sync repositories directly.
- Sync handlers must be idempotent.
- Event ordering must not be assumed unless the implementation makes it explicit.

If a module does not publish the events sync needs yet, add module-local domain events there first. Do not bypass the event model with controller-level sync calls.

## Cross-Module Apply Pattern

Incoming remote changes must not import another module's private `domain/`, `application/`, or `infrastructure/` folders.

Use an explicit public contract pattern:

1. `sync` defines a public participant contract, for example `SyncParticipantPort`.
2. Each module that wants to receive remote changes exports a deliberate adapter that implements that contract.
3. `sync` routes incoming changes by `moduleName` to the matching participant.
4. The participant translates the sync envelope into that module's own use cases.

This keeps boundaries aligned with the existing rule: modules communicate through public contracts, application ports, or events.

## Versioned HTTP API

All sync HTTP endpoints belong to the existing versioned server API surface.

Default operator endpoints:

- `GET /api/v1/sync/status`
- `GET /api/v1/sync/jobs`
- `GET /api/v1/sync/conflicts`
- `POST /api/v1/sync/run`
- `POST /api/v1/sync/retry/:jobId`
- `POST /api/v1/sync/conflicts/:conflictId/resolve`

Default machine-to-machine endpoints:

- `POST /api/v1/sync/push`
- `GET /api/v1/sync/pull`
- `POST /api/v1/sync/ack`

Guidance:

- Prefer HTTP for sync APIs; GraphQL is optional and should not be the default transport for batch sync.
- Protect operator endpoints with the existing auth guard and permission decorators.
- Add explicit RBAC entries such as `sync.read`, `sync.run`, `sync.resolve`, and `sync.peer` in the shared RBAC catalog when this module is implemented.
- Keep request/response DTOs under `interface/http`.

Do not confuse data sync with the existing `system-update` Git/Docker `sync` action. They are different concerns.

## Persistence Placement

Use Kysely-backed repositories under:

```text
apps/server/src/modules/sync/infrastructure/persistence/
```

Place module migrations and seeders under:

```text
apps/server/src/modules/sync/database/migrations/
apps/server/src/modules/sync/database/seeder/
```

Start with generic sync tables:

- `sync_devices`
- `sync_jobs`
- `sync_checkpoints`
- `sync_conflicts`
- `sync_logs`

Expected columns across most tables:

- `tenant_id`
- `software_id`
- `module_name`
- `entity_name`
- `entity_id`
- timestamps

Prefer one generic change envelope in `payload_json` before introducing module-specific sync tables. Add tables like `sync_contact_changes` only when there is a proven need for specialized indexing, mapping, or retention.

For entry or company-scoped records, keep `company_id`, `accounting_year_id`, or similar context inside the payload metadata when required.

## Queue And Worker Strategy

Start with a database-backed queue inside the modular monolith.

Default approach:

- persist jobs in `sync_jobs`
- trigger processing from a Nest infrastructure adapter
- keep retry and backoff rules in sync application logic
- mark dead-letter state in persistence, not in ad hoc logs

Do not require BullMQ, Redis, RabbitMQ, or Kafka unless the task explicitly includes external queue infrastructure.

If durable async infrastructure is introduced later, hide it behind ports so the use cases stay unchanged.

## Frontend Placement

Sync UI is an operational/settings concern by default.

Put the first frontend slice here:

```text
apps/frontend/features/settings/infrastructure/sync-api.ts
apps/frontend/features/settings/interface/pages/sync-settings-page.tsx
apps/frontend/app/(app)/desk/settings/sync/page.tsx
```

Frontend rules:

- call sync APIs through `authFetch`
- resolve the server base through `getRequiredApiUrl()`
- keep React pages thin
- keep polling, mapping, and retry calls in feature `application/` or `infrastructure/`

Only create `apps/frontend/features/sync/` if sync becomes a first-class workspace instead of a settings/operations page.

## Desktop Boundary

For the offline desktop runtime:

- Electron may manage local process startup and device metadata.
- The local Nest server remains the runtime source of truth.
- Next.js must talk to the local Nest server, not directly to the remote sync peer.
- Connectivity checks and push/pull execution belong in the backend sync module, not in Electron main process code.

## Integration Flow

Outgoing change flow:

```text
ContactsController
  -> CreateContactUseCase
  -> ContactCreatedEvent
  -> EventBus
  -> Sync event handler
  -> EnqueueSyncChangeUseCase
  -> sync_jobs
  -> ProcessSyncQueueUseCase
  -> SyncTransportPort
  -> remote POST /api/v1/sync/push
```

Incoming change flow:

```text
Sync scheduler or manual run
  -> PullRemoteChangesUseCase
  -> remote GET /api/v1/sync/pull
  -> SyncParticipantPort for module
  -> module-local use case
  -> checkpoint/log/conflict update
```

## Module Rollout Strategy

Enable sync one bounded context at a time.

Recommended order for current repo modules:

1. `common`
2. `companies`
3. `contacts`
4. `products`
5. `entries`

Do not try to sync every module in one batch. Each participating module should first have:

- stable write use cases
- domain events for create/update/delete
- a public sync participant contract if incoming apply is needed
- focused tests

## Validation Expectations

Minimum validation for sync work:

- unit tests for sync domain behavior, retry rules, and conflict decisions
- integration tests for event-to-queue persistence
- integration tests for `/api/v1/sync/*` endpoints
- architecture tests proving sync does not import another module's private internals
- frontend tests only when a settings page or operator workflow is added

## Anti-Patterns

Do not:

- put sync business rules in React pages
- put sync orchestration in controllers
- import `contacts/domain`, `products/application`, or other private module internals from `sync`
- make business writes wait for remote network success
- overload `system-update` behavior with data synchronization concerns
- introduce a second folder taxonomy that bypasses `apps/server/src/modules/<module-name>`

## Expected Deliverables For A Sync Batch

For a real sync implementation batch, aim to deliver:

1. `sync` backend module shell
2. module-local migrations
3. application ports and use cases
4. Kysely persistence adapters
5. `/api/v1/sync` HTTP surface
6. event handlers for one participating bounded context
7. tests for boundaries and behavior
8. optional Settings UI if operators need visibility
