# Mail Service Execution Guide

Use this guide when planning or implementing outbound email in `cxnext`.

The goal is to fit mail delivery into the current repository shape:

- NestJS backend under `apps/server`
- Next.js frontend under `apps/frontend`
- modular monolith boundaries
- DDD application flow
- event-driven cross-module integration
- versioned browser APIs under `/api/v1`
- existing SMTP env settings in Core Settings
- the current queue module for background execution

This file is prompt-only. It should guide implementation without inventing a second architecture beside the one already used in this repo.

## Objective

Create a production-ready mail service that covers end-to-end outbound email delivery for:

- OTP emails
- password reset or account recovery emails
- invoice emails
- report emails
- sync alerts
- queue failure alerts
- background worker notifications
- tenant-based mail sending
- SMTP-based integrations
- operator test emails

Mail must be isolated, queue-backed, observable, retryable, and safe for multi-tenant use.

## Runtime Position

- `apps/server` owns mail composition, queue orchestration, transport, retries, templates, logging, and delivery state.
- `apps/frontend` owns operator configuration, template preview, delivery logs, and retry/test-send controls.
- `auth`, `entries`, `sync`, `queue`, `reports`, and future modules emit business facts or invoke public mail contracts; they do not send SMTP directly.
- SMTP secrets and defaults start from the current Core Settings env surface.

Mail is an infrastructure-facing bounded context with a clear application contract.

## Required Backend Placement

Create mail as one backend bounded context:

```text
apps/server/src/modules/mail/
  mail.definition.ts
  mail.module.ts
  mail.registry.ts
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
    templates/
    providers/
    queue/
  interface/
    http/
    graphql/
  database/
    migrations/
    seeder/
```

Notes:

- The repo still requires the standard module shell. Do not create a parallel top-level `modules/mail/templates` tree outside `apps/server/src/modules/mail`.
- If mail needs `templates`, `providers`, or `queue` concepts, keep them nested under `infrastructure/` inside the module.
- Follow the existing registry bootstrap pattern used by other backend modules.

## Required Frontend Placement

Mail is an operational/admin concern.

Recommended frontend placement:

```text
apps/frontend/features/mail/
  domain/
  application/
  infrastructure/
  interface/
    pages/
```

Recommended route surfaces:

```text
apps/frontend/app/(app)/desk/settings/mail/page.tsx
apps/frontend/app/(app)/desk/admin/mail/page.tsx
```

Use Settings for SMTP configuration, test-send, and sender defaults.

Use Admin or Mail pages for delivery logs, retries, queue visibility, and template inspection.

Do not create public `(web)` routes for mail itself.

## Why Nodemailer Fits

Use Nodemailer as the default transport adapter.

It fits this repo because it works well with:

- TypeScript
- SMTP providers
- background workers
- queued sending
- attachments
- HTML and text multipart messages
- test transports such as Ethereal or SMTP capture tools

Nodemailer belongs behind a mail transport port or adapter. Business modules must never depend on Nodemailer directly.

## Core Rule

Never send email directly during the request that handles business work.

Required delivery flow:

```text
Business event or use case
  -> enqueue mail job
  -> background worker executes job
  -> Nodemailer transport sends email
  -> delivery log updates
```

Preferred pattern:

```text
Business Event
  -> Mail queue job
  -> Queue worker
  -> Nodemailer
  -> SMTP provider
```

This follows the same principle as sync and queue-backed processing in the rest of the app.

## Current Repo Integration

The repo already has:

- SMTP env keys in `.env.sample`
- Core Settings support for SMTP values
- an in-app `QueueModule`
- queue persistence via `queue_jobs`
- the shared event bus

Mail should use those existing directions first.

Do not assume Redis or BullMQ are mandatory for the first slice. Keep the design BullMQ-ready, but integrate with the current queue abstraction or public queue entrypoint first.

## Recommended Mail Domain Model

Keep the mail domain focused on outbound delivery and audit, not on business semantics like invoices or OTP policy.

Good candidates:

- `OutboundMail`
- `MailDeliveryAttempt`
- `MailTemplate`
- `MailTemplateVersion`
- `MailSenderProfile`
- `MailRecipient`
- `MailAttachment`
- `MailDeliveryLog`

Good value objects:

- `MailMessageId`
- `MailStatus`
- `MailChannel`
- `MailTemplateKey`
- `MailPriority`
- `MailAddress`
- `MailProviderKind`

Good events:

- `mail.enqueued`
- `mail.processing-started`
- `mail.sent`
- `mail.failed`
- `mail.retry-scheduled`
- `mail.dead-lettered`

The mail module should not own invoice, sync, or auth business rules. It only owns rendering, routing, sending, and logging.

## Core Feature Scope

The mail prompt should cover the full lifecycle below.

### Mail Types

Support at least these mail categories:

- `otp`
- `auth-recovery`
- `invoice`
- `report`
- `sync-alert`
- `queue-failure-alert`
- `worker-notification`
- `test`
- `generic-transactional`

### Delivery Capabilities

- HTML + plain text multipart messages
- attachments
- inline logo or asset references when needed
- reply-to support
- CC and BCC where allowed
- delivery retries
- dead-letter handling
- priority support
- idempotency or dedupe support
- send-at scheduling if later required

### Multi-Tenant Support

Support at least:

- global SMTP defaults from Core Settings
- tenant-aware sender profiles
- optional company-aware overrides when branding is company-specific
- sender name/email overrides per tenant or company
- branded templates by tenant or company

Recommended context:

- `tenant_id`
- optional `company_id`
- requested by user id
- source module
- source record id where applicable

## Templates

Mail templates must be first-class.

Required template families:

- OTP email
- password reset or recovery email
- invoice delivery email
- report delivery email
- sync alert email
- queue failure alert email
- generic system notification email
- test email

Template rules:

- store a stable template key
- support subject, preview text, HTML, and plain text output
- render variables through a dedicated renderer
- keep template rendering outside controllers
- version templates when edits become user-managed

Start with file-based or TypeScript-rendered templates under:

```text
apps/server/src/modules/mail/infrastructure/templates/
```

If richer design tooling is added later, hide it behind a template renderer port.

## Queue Strategy

Mail should execute in background through the existing queue direction.

Recommended queue names and jobs:

- queue: `mail`
  - job: `send-otp`
  - job: `send-auth-recovery`
  - job: `send-invoice`
  - job: `send-report`
  - job: `send-sync-alert`
  - job: `send-queue-alert`
  - job: `send-test`
  - job: `send-generic`

Rules:

- business modules enqueue mail work through a public contract or event handler
- mail workers perform rendering and transport delivery
- delivery attempts update mail logs and queue state
- retries and backoff belong in background execution, not in request handlers

If BullMQ plus Redis is introduced later, keep mail use cases unchanged and swap only the queue adapter.

## Cross-Module Boundaries

Mail may integrate with other modules only through explicit boundaries.

### Auth Boundary

Auth owns the business event like OTP requested or recovery requested.

Mail handles:

- template selection
- variable rendering
- recipient resolution
- delivery
- logging

Auth must not build SMTP transport or send the message directly.

### Entries Boundary

Entries or reports may request invoice/report delivery.

Mail handles:

- recipient resolution
- attachment packaging
- subject and body rendering
- queued delivery
- send result logging

Entries must not call Nodemailer directly.

### Sync And Queue Boundary

Sync and queue failures may trigger alerts.

Mail should send those alerts only after a clear business or operational event.

Avoid recursive failure loops:

- if mail delivery itself fails, do not enqueue another mail alert on the same failing path
- log the failure and expose it through admin surfaces
- use alternate escalation only if explicitly designed

### Media Boundary

Re-use existing media or storage references for logos and branded assets.

Do not add a second binary asset store inside the mail module.

## Event Pattern

Use the event-first approach for mail triggers.

Good upstream events:

- `auth.otp-requested`
- `auth.password-reset-requested`
- `entries.invoice-approved`
- `reports.report-generated`
- `sync.job-failed`
- `queue.job-failed`

Good mail events:

- `mail.enqueued`
- `mail.sent`
- `mail.failed`

Rules:

- upstream modules publish meaningful facts
- mail listens and enqueues delivery work
- mail sending occurs after the source state change, not inside it
- handlers must be idempotent where practical

## Application Layer Shape

Use cases should orchestrate composition, enqueueing, rendering, and delivery.

Typical use cases:

- `EnqueueOtpMailUseCase`
- `EnqueueRecoveryMailUseCase`
- `EnqueueInvoiceMailUseCase`
- `EnqueueReportMailUseCase`
- `EnqueueSyncAlertMailUseCase`
- `EnqueueQueueFailureAlertUseCase`
- `EnqueueTestMailUseCase`
- `SendQueuedMailUseCase`
- `RetryFailedMailUseCase`
- `CancelQueuedMailUseCase`
- `ListMailLogsUseCase`
- `GetMailDeliveryUseCase`
- `PreviewMailTemplateUseCase`
- `TestMailTransportUseCase`

Application ports should end with `Port`.

Good candidates:

- `MailRepositoryPort`
- `MailLogRepositoryPort`
- `MailTransportPort`
- `MailTemplateRendererPort`
- `MailQueuePort`
- `MailSenderProfilePort`

## Provider Strategy

Start with SMTP plus Nodemailer.

Required transport capabilities:

- pooled transport creation
- secure and insecure SMTP modes
- auth credentials
- timeout handling
- transport health check or test connection
- per-tenant or per-company sender configuration when supported

Place provider-specific code under:

```text
apps/server/src/modules/mail/infrastructure/providers/
apps/server/src/modules/mail/infrastructure/adapters/
```

Do not leak provider-specific response types into domain objects or controllers.

## Versioned HTTP API

Keep mail HTTP endpoints under the existing API surface.

Recommended admin endpoints:

- `GET /api/v1/mail/status`
- `POST /api/v1/mail/test`
- `GET /api/v1/mail/templates`
- `POST /api/v1/mail/templates/:templateKey/preview`
- `GET /api/v1/mail/logs`
- `GET /api/v1/mail/logs/:mailId`
- `POST /api/v1/mail/logs/:mailId/retry`
- `POST /api/v1/mail/logs/:mailId/cancel`

Recommended internal or protected trigger endpoints when necessary:

- `POST /api/v1/mail/invoice`
- `POST /api/v1/mail/report`

Guidance:

- prefer event-driven enqueue from business modules over direct controller-triggered delivery
- protect admin endpoints with auth guards and explicit permissions
- validate boundary DTOs with the repo validation approach
- use Settings or admin pages for operational controls, not ad hoc secret endpoints

## Permissions

Add explicit mail permissions when the module is implemented.

Recommended baseline:

- `mail.read`
- `mail.list`
- `mail.create`
- `mail.update`
- `mail.delete`
- `mail.report`

If finer actions are needed, define them deliberately in the shared auth catalog before use. Good additions:

- `mail.send-test`
- `mail.retry`
- `mail.cancel`
- `mail.template-preview`

Do not invent one-off permission strings inside controllers.

## Persistence Placement

Keep persistence inside the module:

```text
apps/server/src/modules/mail/infrastructure/persistence/
apps/server/src/modules/mail/database/migrations/
apps/server/src/modules/mail/database/seeder/
```

Expected tables:

- `mail_messages`
- `mail_recipients`
- `mail_attachments`
- `mail_delivery_attempts`
- `mail_templates`
- `mail_sender_profiles`

Recommended message columns:

- `tenant_id`
- optional `company_id`
- `queue_job_id`
- `template_key`
- `category`
- `subject`
- `status`
- `from_email`
- `from_name`
- `reply_to`
- `provider_kind`
- `provider_message_id`
- `requested_by_user_id`
- `source_module`
- `source_record_id`
- `sent_at`
- `last_error`
- timestamps

Module-local migrations and seeders must also be wired into the central DB runner used by `packages/db`. Creating module files alone is not enough.

## Frontend Surfaces

Recommended operator UI:

### Settings > Mail

- SMTP configuration visibility through existing Core Settings
- test send form
- transport health check
- default sender preview
- tenant/company sender override management if implemented

### Admin > Mail

- mail log list
- filter by status, category, tenant, company, and source module
- view message metadata
- retry failed sends
- cancel queued sends
- template preview
- queue correlation where applicable

## Security And Safety

Mail handling must protect secrets and sensitive content.

Rules:

- never expose `SMTP_PASS` in UI or logs
- avoid logging raw OTP values unless strictly necessary
- redact sensitive tokenized URLs in debug logs where possible
- apply rate limiting to OTP and recovery trigger flows
- validate email addresses before enqueueing
- reject oversized attachments
- separate user-facing failures from low-level SMTP errors

SPF, DKIM, and DMARC are deployment concerns and should be documented, not hardcoded in app logic.

## Attachment Strategy

Support attachments for:

- invoices
- reports
- exported documents

Rules:

- generate attachments before enqueueing or in a worker-safe rendering stage
- keep attachment metadata in mail records
- avoid storing duplicate binary payloads long-term unless required
- reuse existing report or print generation outputs when available

## Recommended End-To-End Scenarios

A real mail implementation should pass end-to-end flows like:

1. user requests OTP
   - auth emits event
   - mail job is queued
   - worker sends OTP email
   - delivery is logged

2. user sends invoice by email
   - entries or report flow creates attachment
   - mail job is queued
   - worker sends invoice email with attachment
   - log stores provider result

3. sync failure alert
   - sync emits failure event
   - mail job is queued for operational recipients
   - worker sends alert

4. queue failure alert
   - queue failure emits operational event
   - mail sends alert without recursive failure loops

5. tenant-specific sender
   - tenant override is resolved
   - mail uses tenant sender profile instead of global default

6. failed SMTP send
   - retry policy applies
   - final failure moves to dead-letter or failed state
   - admin can inspect and retry

## End-To-End Test Strategy

For real implementation, include E2E and integration coverage using a safe SMTP test target such as Mailpit, MailHog, or Nodemailer Ethereal.

Minimum scenarios:

- SMTP env configuration loads correctly
- transport test endpoint succeeds with valid config
- OTP event produces exactly one queued mail and one send
- invoice email sends with expected attachment metadata
- sync alert sends to configured operational recipients
- failed transport triggers retry and final failure state
- retry from admin endpoint re-enqueues and resends
- tenant override changes sender identity correctly
- template preview renders both subject and body variants
- logs redact secrets and sensitive provider details appropriately

## Anti-Patterns

Do not:

- send mail directly from controllers
- send mail inline inside business transactions
- duplicate SMTP config storage outside current Core Settings direction without a clear reason
- let business modules depend on Nodemailer
- hardcode HTML bodies inside controllers or event handlers
- write directly to queue tables from unrelated modules
- create recursive mail alerts for mail delivery failures
- skip delivery logging and retry state
- require Redis or BullMQ for the first slice if the current queue module already satisfies the flow

## Expected Deliverables For A Mail Batch

For a real implementation batch, aim to deliver:

1. backend `mail` bounded context shell
2. Nodemailer transport adapter
3. template rendering layer
4. queue-backed send flow
5. SMTP test and health-check flow
6. delivery logs and retry handling
7. tenant-aware sender configuration
8. invoice/report attachment flow
9. admin/settings UI for logs and test send
10. E2E coverage with a test SMTP target

## Pattern Fit Checklist

Before accepting any mail implementation, confirm all of the following:

- backend code lives under `apps/server/src/modules/mail`
- frontend operational code lives under `apps/frontend/features/mail` or the appropriate settings/admin feature surfaces
- SMTP values reuse the current Core Settings env policy
- business modules do not send email directly
- queue-backed delivery is used for real sends
- Nodemailer is hidden behind an adapter or port
- APIs use `/api/v1`
- auth guards protect operational mail endpoints
- domain code stays framework-free
- templates are isolated from controllers
- queue integration is BullMQ-ready but not BullMQ-dependent for the first slice
- migrations are wired into the central DB runner
- logs, retries, and dead-letter states exist
- OTP, invoice, sync alert, queue alert, report, and worker notification scenarios are covered
