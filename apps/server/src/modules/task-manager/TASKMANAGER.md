# Task Manager Support Notes

## Purpose

Task Manager is a tenant-scoped work tracking module for assigning office/application tasks to staff, linking tasks to
business records, tracking verification and auditor follow-up needs, and recording activity history.

It belongs to the tenant/client dashboard surface, not the admin helpdesk or super-admin platform surface.

## Main Files

- `task-manager.module.ts` wires the controller, service, repository, tenant context, auth repository dependencies, and
  queue service.
- `task-manager.controller.ts` exposes the HTTP API under `api/v1/task-manager`.
- `task-manager.service.ts` resolves tenant context and permission before calling repository methods.
- `task-manager.repository.ts` contains all Kysely persistence logic and activity logging.
- `task-manager.types.ts` defines task, activity, input, priority, and status types.
- `task-manager.migration.ts` creates tenant-local task tables.
- `index.ts` exports the module and migration.

## API Surface

Base route: `api/v1/task-manager`

- `GET /` lists active tasks for the resolved tenant.
- `GET /settings` returns tenant Task Manager defaults and creates the row when missing.
- `POST /settings/upsert` updates tenant Task Manager defaults.
- `GET /categories` and `POST /categories/upsert` manage task categories.
- `GET /tags` and `POST /tags/upsert` manage task tags.
- `GET /templates` and `POST /templates/upsert` manage reusable task templates.
- `GET /campaigns`, `POST /campaigns/upsert`, campaign item upsert, and campaign status routes manage repeatable work
  campaigns.
- `POST /campaigns/:campaignUuid/items/:itemUuid/create-task` creates or reuses a real task from a campaign item and
  stores `task_id` back on that campaign item.
- `POST /campaigns/:campaignUuid/delete` deletes a campaign and its campaign items. Linked tasks remain; campaign item
  task references are not force-deleted.
- `GET /reminders`, `POST /reminders/upsert`, and reminder complete routes manage dashboard reminders.
- `GET /:idOrUuid` returns one task by numeric id or public uuid.
- `POST /upsert` creates or updates a task.
- `POST /:idOrUuid/status` changes task status.
- `POST /:idOrUuid/comments`, subtask routes, and attachment routes manage authorized task work notes, child work, and files.
- `POST /:idOrUuid/delete` soft-deletes a task by setting `deleted_at`.

All service methods currently resolve tenant access using the `company.manage` policy.

## Data Model

Tenant tables are created by `migrateTaskManagerTables`.

`task_manager_tasks`

- Uses `id INT AUTO_INCREMENT PRIMARY KEY` internally.
- Uses `uuid CHAR(8) UNIQUE` for public/API references.
- Stores `tenant_id`, optional `company_id`, and tenant-unique `task_no`.
- Tracks task content: `title`, `subject`, `description`.
- Links to business context with `module_key`, linked record fields, source module fields, and source snapshot JSON.
- Tracks assignment with `assigned_to`, `assigned_to_name`, `assigned_by`, reviewer, claimed user, and watchers JSON.
- Tracks workflow with `priority`, `status`, due/reminder/recurrence fields, started/completed/reviewed timestamps, reopen
  count, and overdue timestamp.
- Tracks task flags with verification, auditor follow-up, and completion confirmation fields.
- Stores `score` for performance tracking.
- Uses `deleted_at` for soft delete.

`task_manager_settings`

- One row per tenant.
- Stores defaults for assignee, reviewer, priority, task type, reminder lead days, reminder hour, open-task claiming,
  authorized comments, completion confirmation, campaign reminders, task media visibility, and task media folder.
- Repository `settings()` creates the default row when missing.
- Task creation uses these defaults when the task input omits equivalent fields.
- Task attachment upload UI reads `media_folder` and `media_visibility`.

`task_manager_activities`

- Stores activity rows for create, update, status change, and delete events.
- Links by `task_id`.
- Stores actor email, message, JSON payload, and created timestamp.

Other tenant tables:

- `task_manager_categories`, `task_manager_tags`, and `task_manager_task_tags` provide lookup and autocomplete support.
- `task_manager_comments`, `task_manager_subtasks`, and `task_manager_attachments` provide the authorized work thread.
- `task_manager_templates` stores reusable task definitions.
- `task_manager_campaigns` and `task_manager_campaign_items` store repeatable temporary work lists.
- `task_manager_reminders` stores dashboard reminder work.

Campaign item task bridge:

- Campaign item rows can now become real `task_manager_tasks` rows through the create-task route.
- The generated task copies source module/type/id/uuid/label from the campaign item.
- The generated task stores campaign result payload in `result_payload` and extracts source snapshot data from
  `invoice_snapshot`, `contact_snapshot`, or `source_snapshot` when present.
- The campaign item `task_id` is updated so repeated create-task calls reuse the existing task instead of duplicating
  work.

## Status Values

Allowed statuses are:

- `new`
- `todo`
- `in_progress`
- `review`
- `completed`
- `cancelled`

Repository fallback behavior:

- Unknown status values become `new`.
- Empty or unknown priority values become `normal`.

## Important Behavior

- Creating a task requires a non-empty `title`.
- New task numbers are generated as `TASK-<year>-<sequence>`.
- New tasks attach to the tenant's primary company when one exists.
- Updating by `uuid` requires the existing task to be found, otherwise a `NotFoundException` is thrown.
- `idOrUuid` lookup treats numeric strings as internal ids unless the string length is exactly 8, in which case it is
  treated as a public uuid.
- List results exclude soft-deleted tasks and sort by `updated_at DESC`, then `id DESC`.
- Each returned task includes its activity history.
- `upsert` enqueues `task-manager.task-upserted`.
- `status` enqueues `task-manager.status-changed`.
- Creating a task from a campaign item enqueues `task-manager.campaign-item-task-created`.

## Frontend Counterpart

Frontend files live at:

`apps/frontend/src/features/task-manager`

Important frontend files:

- `task-manager-client.ts` calls this backend API.
- `task-manager-page.tsx` provides list, filter, create, edit, show, status change, and delete UI.
- `task-manager-automation-page.tsx` provides Templates, Campaigns, Reminders, Performance, Categories, Tags, and Task
  Settings pages.
- Campaigns use list/show/upsert flow. Upsert offers campaign type choices such as Sales invoice GST/Tally verification,
  Contact phone/email confirmation, and Manual campaign.
- `priority-autocomplete.tsx` supports task priority selection/creation through master data.

The dashboard lazy-loads `TaskManagerPage` and `TaskManagerAutomationPage`, and displays the app as `Task Manager`.

## Registration Points

- Backend module import: `apps/server/src/modules/index.ts`
- Tenant DB migration call: `apps/server/src/infrastructure/tenant-database/tenant-database.connection.ts`
- Frontend dashboard app entry: `apps/frontend/src/components/blocks/dashboard/dashboard-apps.ts`
- Frontend route rendering: `apps/frontend/src/components/blocks/dashboard/dashboard-view.tsx`

## Support Checklist

When changing this module:

1. Keep tenant isolation intact through `TenantContextService`.
2. Preserve public uuid API usage; avoid exposing numeric ids as the preferred frontend identifier.
3. Update `task-manager.types.ts`, frontend client types, and migration together when adding fields.
4. Add activity rows for meaningful task mutations.
5. Keep soft delete behavior unless a hard-delete migration/cleanup is explicitly requested.
6. Check queue event consumers before renaming event types.
7. Run targeted backend and frontend type checks after schema or API changes.

## Future Plan: Central Task Manager

Task Manager should grow into the centralized work engine for all tenant apps. Every module should be able to raise
tasks, attach business context, assign work, collect replies/comments, track reminders, and measure staff performance.

Current status:

- Implemented: task scopes, settings, categories, tags, comments, attachments, subtasks, templates, campaigns,
  campaign item work table, reminders table/UI, sales invoice verification campaign, contact cleanup campaign, and
  campaign-item-to-task creation.
- Still future: task-specific permission policies, recurring task generation, reminder queue delivery/escalation,
  quick-create buttons inside source module pages, richer performance reports, generic multi-record task links, and
  automated source-record updates from completed campaign item payloads.

### Product Direction

Task Manager should behave like an internal project/issue manager for the tenant workspace:

- Any app module can create or link a task.
- Users work against tasks rather than only against source records.
- Tasks can collect authorized-user comments, replies, attachments, image proofs, and activity events.
- Tasks can have sub-tasks for checklist-style or delegated work.
- Tasks can be linked to invoices, contacts, companies, GST filings, purchases, payments, stock records, or
  general/non-linked execution work.
- Tasks can be internal, external/client-facing, compliance/reminder-based, or collection/confirmation-based.
- Task history should become an audit trail for who did what, when, and against which business record.
- Task Manager should support repeatable work campaigns where a source module produces a temporary/actionable work list,
  staff complete checks with remarks, and the campaign can later be reset or raised again.

### Example Task Types

1. Verify all sales invoices with GST portal and Tally.
    - Internal task.
    - Should link to one invoice, many invoices, or a filtered invoice batch.
    - May require verification proof, comments, and completion confirmation.

2. Collect all originals from client.
    - External execution task.
    - May link to a client/contact but not necessarily to an invoice.
    - Needs assignee, due date, comments, and completion proof.

3. File GST before the 10th every month.
    - Compliance reminder task.
    - Should support recurring schedule/reminder.
    - Should link to GST filing period and client/contact/company where relevant.

4. Collect fees from client.
    - Reminder and confirmation task.
    - Needs collection confirmation fields: collected amount, collected by, collected at, payment mode/reference, and
      optional proof attachment.

5. General follow-up or execution work.
    - May have no source record.
    - Should still support assignment, comments, tags, category, due date, priority, and activity tracking.

6. Sales invoice verification campaign.
    - Pull sales invoice rows into a task campaign.
    - Each invoice row can have a checked/completed flag, verification remarks, assigned user, and status.
    - Campaign data can be reset or recreated later without deleting the original sales invoices.

7. Contact data completion campaign.
    - Pull contacts missing or needing confirmation of email/phone details.
    - Each contact row can have checkboxes, remarks, updated values, and completion metadata.
    - Useful for staff follow-up and measurable data cleanup work.

### Task Views and Classification

The frontend should expose clear task channels instead of one flat list:

- `My Tasks`
    - Tasks assigned to me.
    - Tasks created by me.
    - Tasks assigned by me to others, so I can follow up.
    - This is the user's complete personal responsibility view.

- `Assigned To Me`
    - Pending tasks where `assigned_to` is the current user.
    - Focused execution view for today's staff work.
    - Should normally exclude completed/cancelled tasks unless filters request them.

- `Open Tasks`
    - Tasks with no assignee.
    - Visible to authorized tenant users.
    - Used as a shared queue where staff or managers can pick/assign work.

- `All Tasks`
    - Manager/admin view according to permission.
    - Useful for filtering by user, category, tag, module, status, due date, overdue, and campaign.

Suggested API query names:

- `scope=my`
- `scope=assigned-to-me`
- `scope=open`
- `scope=all`

Suggested naming in UI:

- My Tasks
- Assigned To Me
- Open Tasks
- All Tasks

### Data Model Expansion

Implemented tables:

- `task_manager_tasks`
    - Includes category, task type, source module/type/id/uuid/label, source snapshot, recurrence/reminder fields,
      confirmation fields, lifecycle/performance timestamps, and score.

- `task_manager_comments`
    - Threaded comments and replies.
    - Comments are for authorized users who can work with the task.
    - Fields: `task_id`, optional `parent_comment_id`, `actor_email`, `body`, `visibility`, timestamps, soft delete.

- `task_manager_attachments`
    - Images, documents, proofs, invoice files, screenshots, or external references.
    - Fields: `task_id`, optional `comment_id`, `storage_key`, `file_name`, `mime_type`, `file_size`, `attachment_type`,
      `uploaded_by`, timestamps.
    - Should reuse the existing Media/storage approach.
    - Store files under tenant storage, preferably `storage/<tenant>/private/task/files` for internal work and
      `storage/<tenant>/public/task/files` only when files must be publicly served.

- `task_manager_subtasks`
    - Lightweight child tasks/checklist items.
    - Fields: `task_id`, `title`, `status`, `assigned_to`, `due_date`, `completed_by`, `completed_at`, sort order.

- `task_manager_tags`
    - Tenant-defined task tags.
    - Fields: `tenant_id`, `name`, `slug`, `color`, active flag.
    - Should align with Master Data-style autocomplete and create-record UX.

- `task_manager_task_tags`
    - Many-to-many task/tag mapping.

- `task_manager_categories`
    - Tenant-defined categories such as Internal, Client Collection, GST, Sales Verification, Payment Follow-up.
    - Fields: `tenant_id`, `name`, `slug`, `color`, `description`, active flag.
    - Should align with Master Data-style autocomplete and create-record UX.

- `task_manager_reminders`
    - Reminder schedule and execution state.
    - Fields: `task_id`, `remind_at`, `recurrence_rule`, `channel`, `status`, `last_sent_at`, `next_remind_at`.

- `task_manager_campaigns`
    - Repeatable work batches generated from modules or templates.
    - Examples: sales invoice GST/Tally verification batch, contact phone/email completion batch, monthly GST filing
      batch.
    - Fields: `tenant_id`, `uuid`, `name`, `campaign_type`, `source_module`, `status`, `generated_by`, `generated_at`,
      `closed_at`, `reset_at`, `settings`, timestamps.

- `task_manager_campaign_items`
    - Work rows inside a campaign.
    - Each row can point to a source record and also carry task execution data.
    - Fields: `campaign_id`, optional `task_id`, `source_module`, `source_record_type`, `source_record_id`,
      `source_record_uuid`, `source_record_label`, `assigned_to`, `status`, `is_checked`, `remarks`, `result_payload`,
      `completed_by`, `completed_at`, timestamps.

- `task_manager_templates`
    - Reusable task/campaign templates not tied to a single module yet.
    - Fields: `tenant_id`, `name`, `template_type`, `category_id`, `default_tags`, `default_priority`,
      `default_due_rule`, `requires_confirmation`, `settings`, active flag.

Future candidate table:

- `task_manager_links`
    - Optional generic link table when one task can relate to many records.
    - Fields: `task_id`, `module_key`, `record_type`, `record_id`, `record_uuid`, `record_label`, `link_role`.

### Module Integration Contract

Each module should raise tasks through a small backend API/service contract rather than writing directly to task tables.

Suggested service methods:

- `createTaskFromModule(context, input)` (future public module contract; repository `upsert` already supports source fields)
- `linkTaskToRecord(context, taskUuid, linkInput)`
- `createReminderTask(context, input)`
- `createConfirmationTask(context, input)`
- `addTaskActivity(context, taskUuid, activityInput)`
- `createCampaignFromTemplate(context, input)`
- `addCampaignItems(context, campaignUuid, items)` (campaign item upsert exists for individual/manual rows)
- `createTaskFromCampaignItem(context, campaignUuid, itemUuid, input)` (implemented)
- `resetCampaign(context, campaignUuid)` (implemented through campaign status `reset`)
- `closeCampaign(context, campaignUuid)` (implemented through campaign status `closed`)

Suggested module task input:

- `source_module`
- `source_record_type`
- `source_record_uuid`
- `source_record_label`
- `title`
- `description`
- `task_type`
- `category`
- `tags`
- `assigned_to`
- `priority`
- `due_date`
- `reminder_at`
- `requires_confirmation`
- `payload`

Suggested campaign item input:

- `source_module`
- `source_record_type`
- `source_record_id`
- `source_record_uuid`
- `source_record_label`
- `assigned_to`
- `status`
- `check_fields`
- `remarks`
- `payload`

### Workflow States

Current statuses can remain, but future work may need state groups:

- Intake: `new`, `todo`
- Execution: `in_progress`
- Review: `review`
- Done: `completed`
- Stopped: `cancelled`

Optional future states:

- `blocked`
- `waiting_client`
- `waiting_external`
- `overdue`

Overdue can also be computed from `due_date` instead of stored as a status.

### Performance Tracking

Task Manager should support user performance measurement without turning every task into only a score field.

Useful metrics:

- Assigned tasks count.
- Completed tasks count.
- Completion rate.
- Average completion time.
- Overdue count.
- Reopened/review-failed count.
- Verification-required tasks completed.
- Confirmation-required tasks completed.
- Category-wise performance.
- Client/module-wise workload.

Performance should be derived from task lifecycle and activity history where possible. Manual `score` can remain as an
override or manager rating.

### Reminder and Recurrence Behavior

Reminder tasks should support:

- One-time reminders.
- Monthly reminders such as GST filing before the 10th.
- Reminder status: pending, sent, acknowledged, completed, skipped.
- Assignment and escalation.
- Completion confirmation with actor and timestamp.

Recurring tasks should create concrete task instances for each period, not only show a virtual reminder, so the work has
audit history.

### Frontend Expansion

The UI should grow from a simple list/detail page into a project-manager style task desk:

- Task inbox/list with channels for My Tasks, Assigned To Me, Open Tasks, and All Tasks.
- Filters by status, assignee, creator, assigned-by, module, category, tag, due date, overdue, reminder, campaign, and
  source record.
- Task detail page with comments/replies, attachments, sub-tasks, linked records, activity timeline, and confirmation
  panel.
- Quick-create task dialog from any module record page.
- "Raise task" action on invoices, contacts, GST filings, payments, stock records, and other important records.
- Reminder dashboard for upcoming/overdue compliance and collection tasks.
- User performance view by date range, category, module, and assignee.
- Campaign workspace for repeated/batch work, with item checkboxes, remarks, assignee, status, reset, and close actions.

### Implementation Phases

Phase 1: Foundation - Implemented

- Add categories and tags.
- Add comments/replies.
- Add attachments linked to task and optionally comment.
- Add sub-tasks.
- Add richer source/link fields while keeping current `module_key`, `linked_record_id`, and `linked_record_label`
  backward compatible.
- Add task scopes for My Tasks, Assigned To Me, Open Tasks, and All Tasks.

Phase 2: Templates and Campaigns - Implemented

- Add task templates.
- Add campaign and campaign item tables.
- Add APIs to create/reset/close campaigns.
- Add frontend campaign workspace.
- Add manual campaign and item creation.
- Add sales invoice verification and contact cleanup campaign generators.
- Add campaign item task creation.

Phase 3: Module Task Raising - Partly Implemented

- Add backend service contract for modules to raise/link tasks.
- Add task creation from Sales invoices through campaign item task creation.
- Add task creation from Contacts/Clients through campaign item task creation.
- Add task creation from GST Filing.
- Add quick-create UI from selected module pages.

Phase 4: Reminders and Confirmations - Partly Implemented

- Add reminder table and reminder UI.
- Add reminder queue processing.
- Add recurring task generation.
- Add confirmation payloads for collection/payment/proof tasks.
- Add GST monthly filing reminder flow.

Phase 5: Performance and Reporting - Partly Implemented

- Add starter campaign/reminder performance cards.
- Add staff workload and performance reports.
- Add overdue and completion analytics.
- Add category/module/user summary cards.
- Add export/print if needed.

Phase 6: Hardening

- Add permission model specific to task management.
- Add tests for task creation, comments, attachments, sub-tasks, reminders, and module integration.
- Add migration compatibility checks for existing task records.

### Open Design Questions

- Should task comments be visible to all authorized tenant users, or only users assigned/mentioned/manager roles?
    - Current implementation uses authorized-user comments.
- Should `task-tags` and `task-categories` remain dedicated Task Manager tables with Master Data-style UX, or should
  they later become actual Master Data modules with mappings?
    - Current implementation uses dedicated Task Manager tables.
- Should recurring tasks be generated by queue on schedule, or generated lazily when the dashboard opens?
- Which module should be integrated next after Sales invoice verification and Contact cleanup: GST filing or client fee
  collection?

### Pre-Implementation Refinements

Before implementation, keep the architecture split into three layers:

1. Task Core
    - One actionable work item.
    - Owns assignment, status, due date, comments, replies, attachments, sub-tasks, tags, categories, source link, and
      activity.

2. Task Templates
    - Reusable definitions for simple tasks and repeatable task/campaign patterns.
    - Defines default category, tags, priority, due rule, confirmation needs, and result fields.

3. Task Campaigns
    - Repeatable work batches generated from templates or source modules.
    - Examples: monthly GST filing batch, sales invoice verification batch, contact data cleanup batch.
    - Campaigns should be closable/archivable/resettable without deleting source module data.

#### Task vs Campaign

A task is one actionable work item.

Examples:

- Verify invoice `INV-1023`.
- Collect original documents from a client.
- Confirm fee collection for one client.

A campaign is a batch or repeated work run that may create or contain many task items.

Examples:

- June Sales Invoice GST/Tally Verification.
- June GST Filing Follow-up.
- Contact Phone and Email Confirmation Run.

#### Source Contract

Every task and campaign item should be able to remember where it came from:

- `source_module`
- `source_record_type`
- `source_record_id`
- `source_record_uuid`
- `source_record_label`
- `source_snapshot`

`source_snapshot` is important because source records can change later. Task history should preserve what staff saw when
the work was raised.

#### Assignment Model

Start with direct assignment but leave room for richer responsibility:

- `assigned_to`
- `assigned_to_name`
- `assigned_by`
- `reviewer`
- `watchers`
- `claimed_by`

Open task flow:

1. Task starts unassigned in Open Tasks.
2. User claims it or manager assigns it.
3. Task moves into Assigned To Me/My Tasks.
4. User starts, comments, attaches proof, submits/reviews/completes.

#### Permission Model

Do not keep Task Manager permanently tied only to `company.manage`.

Planned policies:

- `task.view`
- `task.manage`
- `task.assign`
- `task.comment`
- `task.review`
- `task.report`

Initial implementation may keep `company.manage` for compatibility, but future migrations should add and use
task-specific policies.

#### Work Result Schema

Templates and campaign items should support structured result fields rather than only free-text remarks.

Examples:

- Invoice verification: `checked`, `gst_verified`, `tally_verified`, `remarks`.
- Fee collection: `amount`, `payment_mode`, `collected_by`, `proof`.
- Contact update: `phone_confirmed`, `email_confirmed`, `corrected_phone`, `corrected_email`, `remarks`.

Use `result_payload` for flexible structured completion data.

#### Reminder Rules

Use separate fields for work deadline and notification behavior:

- `due_at`
- `reminder_at`
- `recurrence_rule`
- `period_key`

`period_key` examples:

- `2026-06` for monthly GST filing.
- `FY2026-27` for yearly compliance.

This prevents duplicate recurring task generation.

#### Performance Fields

Performance should mostly be derived from lifecycle and activity data, but a few fields help reporting:

- `first_assigned_at`
- `started_at`
- `completed_at`
- `reviewed_at`
- `reopened_count`
- `overdue_at`
- `score`

Useful reports:

- Assigned count.
- Completed count.
- Overdue count.
- Average completion time.
- Reopened count.
- Category-wise performance.
- Module-wise workload.
- Campaign completion performance.

#### Template Types

Suggested template types:

- `simple_task`
- `record_checklist`
- `collection_confirmation`
- `compliance_reminder`
- `data_cleanup`
- `approval_review`

These types should control default UI and required result fields.

#### Comments and Mentions

Comments are for authorized users who can work with or view the task.

Plan for:

- Threaded replies.
- Mentions.
- Activity events from comments.
- Attachments on comments.
- Internal visibility by default.

#### Campaign Archival and Reset

Do not delete completed campaign history by default.

Use:

- `closed`
- `archived`
- `reset`
- `regenerated`

For repeated work, create a new campaign from the same template or reset a draft/open campaign. Preserve closed campaign
history so staff performance remains measurable.
