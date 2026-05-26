# CXSun Gap Plan

Updated: 2026-05-25

This document replaces the old gap notes with a fresh staged plan for scaling CXSun as a multi-domain, multi-tenant business platform. The current application can continue as one product, but it must be hardened around tenant isolation, vertical feature packs, background work, database safety, and operational update workflows before many different customer industries run on the same installation.

## 1. Current Position

1.1. The application already has a useful base for one platform serving many tenants:

- Master MariaDB stores tenants, tenant domains, platform users, industries, policy metadata, queue jobs, and operational state.
- Tenant MariaDB databases hold tenant-owned companies, common masters, sales, purchase, stock, settings, and entry data.
- Frontend surfaces are separated into public, tenant app, admin desk, and super-admin dashboard.
- Super-admin now has system update, queue manager, and database manager direction.
- Deployment is moving toward Docker with external Redis and MariaDB preserved across app reinstall.

1.2. The product direction is feasible as one platform if each tenant gets:

- domain-bound access,
- tenant database isolation,
- industry/vertical feature packs,
- tenant-specific settings,
- queue-backed heavy jobs,
- backup and restore safety,
- strict role and permission enforcement.

1.3. Splitting into separate apps is not needed immediately. Split later only if one vertical becomes large enough to need its own release cycle, database model, or team ownership.

## 2. Main Gaps

2.1. Tenant isolation is the highest product risk.

- Tenant resolution must be bound to host, session, selected tenant, and user access.
- Tenant-facing routes must not allow arbitrary tenant switching by headers.
- Super-admin cross-tenant access must be explicit, audited, and separate from tenant user behavior.
- Isolation tests are still required for login, domain resolution, tenant context, and every tenant-owned API family.

2.2. Role and permission depth is incomplete.

- Super-admin, admin desk, and tenant user permissions need server-side role checks, not only menu hiding.
- Tenant-local RBAC needs a complete UI and policy assignment workflow.
- Industry feature toggles need to control routes, forms, fields, reports, and API actions.
- Every sensitive system endpoint needs clear permission rules.

2.3. Queue execution is only partly ready.

- Hybrid MariaDB plus BullMQ queue direction is correct for scale.
- Current mail, report, system-update, tenant-maintenance, and event lanes need real processors, not placeholder completion.
- Workers should move into a separate process/container before production load.
- Queue jobs need idempotency keys, retry policy, dead-letter handling, job locking, and audit trails.

2.4. Database safety needs production-grade workflow.

- Backup exists in direction, but restore must be rehearsed and tested.
- Backups need retention policy, checksum verification, compression, encryption, and off-server storage.
- Restore must support dry-run validation before touching a live database.
- Tenant-level restore should be possible without restoring the whole platform.

2.5. Update engine needs safer release discipline.

- System update must remain asynchronous so the UI never waits behind a long build.
- Update must always take database backup first.
- Update must run migrations in controlled order and stop on unsafe migration errors.
- Rollback strategy is not complete unless both code version and database state can be recovered.
- A failed update should leave a clear status page with last command, logs, backup ID, and recovery action.

2.6. Multi-domain and multi-vertical product structure is not formal enough.

- Ecommerce, billing, auditor office, sports club, accounts, offset billing, and garment manufacturing cannot all be built as one flat module list.
- Each vertical needs an industry pack with enabled modules, terminology, document flows, number series, tax rules, reports, and dashboards.
- Shared primitives must stay common: contacts, products, accounts, documents, stock, payments, reports, notifications, files, and audit logs.
- Vertical-specific behavior should be configuration plus extension modules, not hard forks.

2.7. Accounting and finance layer is the biggest missing foundation.

- Accounts, ledger, vouchers, journal, tax posting, receivables, payables, bank/cash, and financial reports are needed before serious billing, auditor, and manufacturing customers.
- Existing sales, purchase, receipt, stock, and document settings need posting rules into accounts.
- Every tenant needs accounting year controls, period locks, opening balances, and audit-safe corrections.

2.8. Reporting and document generation need queue-backed infrastructure.

- Reports must not block API requests.
- Large reports, PDFs, invoices, backups, imports, exports, and email sends should run through queues.
- Report definitions need tenant and industry awareness.
- Generated files need storage lifecycle and permission checks.

2.9. Observability is thin for scale.

- Need structured logs for API, queues, updates, backups, migrations, and tenant resolution.
- Need health checks for MariaDB, Redis, workers, disk space, backup age, and migration status.
- Need admin-visible incident logs and failed job drill-down.

2.10. Testing coverage is not enough for a platform with many tenants.

- Need automated tests for tenant isolation, RBAC, migrations, queue retry, backup/restore, and update failure paths.
- Need smoke tests after deployment and after update.sh.
- Need seed fixtures for multiple industries and multiple tenant domains.

## 3. Blockers

3.1. Critical blockers before scaling to real multi-domain customer use:

1. Tenant isolation must be enforced and tested.
2. Server-side permissions must protect platform, admin, and tenant APIs.
3. Backup and restore must be proven on real MariaDB data.
4. Update workflow must not leave the app half-updated.
5. Queue workers must process real jobs reliably.

3.2. Product blockers before adding many industries:

1. No complete accounts engine.
2. No formal industry pack system.
3. No document workflow engine for invoices, bills, receipts, delivery notes, club billing, audit files, and manufacturing documents.
4. No mature reporting engine.
5. No import/export engine for customer onboarding.

3.3. Operational blockers before production confidence:

1. Worker process is not separated from the API process.
2. Backup retention, verification, encryption, and off-server copy are missing.
3. Restore UX is risky without dry-run validation.
4. Redis and queue health need deployment-level checks.
5. Logs are not centralized enough for support.

## 4. Immediate Focus

### Stage 1 - Stabilize Platform Safety

1.1. Lock tenant resolution.

- Bind tenant context to domain plus authenticated user access.
- Allow tenant override only in super-admin/admin surfaces with explicit permission.
- Add isolation tests for cross-domain login and cross-tenant API access.

1.2. Finish permission enforcement.

- Add role/permission guards to all system, platform, admin, and tenant APIs.
- Ensure menu visibility and backend access use the same permission source.
- Add audit events for super-admin actions.

1.3. Harden update engine.

- Make system update fully backgrounded with persistent status.
- Always create database backup before pull/build/restart.
- Show backup ID, migration result, build result, restart result, and last failure.
- Keep `update.sh` as terminal fallback for broken frontend/API update situations.

1.4. Prove backup and restore.

- Test master plus tenant database backup.
- Test tenant-only restore in a separate database first.
- Add checksum and restore dry-run before live restore.
- Add backup retention settings.

1.5. Finish queue manager baseline.

- Replace placeholder queue processors with real mail, report, backup, update, and event processors.
- Add retry, cancel, requeue, dead-letter, and job detail views.
- Add queue health status for Redis, BullMQ workers, and MariaDB queue table.

### Stage 2 - Production Operations

2.1. Split workers from API runtime.

- Run API, frontend/static server, queue worker, Redis, and MariaDB as separate services.
- Keep Redis external by default.
- Add worker restart policy and health checks.

2.2. Add observability.

- Structured API logs.
- Queue/job logs.
- Update and migration logs.
- Backup age and restore verification status.
- Disk, memory, database, and Redis health cards in super-admin.

2.3. Add release safety.

- Version every release.
- Track current code version, database schema version, and migration history.
- Add preflight checks before update: disk space, DB connectivity, Redis connectivity, dirty worktree, backup tool availability, npm availability.
- Add post-update smoke tests.

2.4. Add migration discipline.

- Master migrations and tenant migrations should be listed, ordered, idempotent, and reversible where possible.
- Show pending/applied/failed migrations in Database Manager.
- Block update if required migrations are unsafe without backup.

## 5. Product Build Phases

### Phase 1 - Core SaaS Foundation

1. Tenant isolation and permission system.
2. Tenant-local role and policy UI.
3. Company context and default company switching.
4. Document settings and number series by tenant/company/year.
5. Audit log for sensitive business and system actions.
6. Import/export base engine.

### Phase 2 - Accounts Foundation

1. Chart of accounts.
2. Ledger groups and ledgers.
3. Opening balances.
4. Journal, contra, payment, receipt, debit note, and credit note vouchers.
5. Tax ledgers and posting rules.
6. Trial balance, ledger book, day book, profit and loss, and balance sheet.
7. Period lock and accounting year close.

### Phase 3 - Billing and Trading Pack

1. Sales invoice and purchase bill.
2. Sales order, delivery note, purchase order, and goods receipt.
3. Customer and supplier balances.
4. GST/tax reports.
5. PDF templates and email/WhatsApp dispatch through queue.
6. Recurring billing where needed.

### Phase 4 - Ecommerce Pack

1. Public catalog by tenant domain.
2. Product detail, cart, checkout, customer account, and order tracking.
3. Payment gateway integration.
4. Inventory reservation and fulfillment.
5. Storefront theme/settings.
6. Channel order import/export.

### Phase 5 - Auditor Office Pack

1. Client file management.
2. Compliance/task calendar.
3. Document request and upload workflow.
4. Staff assignment and review notes.
5. Billing against client services.
6. Compliance reports and reminders.

### Phase 6 - Sports Club Pack

1. Member master.
2. Subscription plans and renewal billing.
3. Attendance/session tracking.
4. Coach/staff assignment.
5. Facility booking.
6. Member communication and dues reports.

### Phase 7 - Garment Manufacturing Pack

1. Style, colour, size, fabric, trims, and BOM.
2. Cutting, stitching, finishing, checking, and packing stages.
3. Job work and production orders.
4. WIP stock and process loss.
5. Size-wise order planning.
6. Manufacturing cost reports.

### Phase 8 - Offset Printing/Billing Pack

1. Paper, plate, ink, lamination, binding, and finishing masters.
2. Quotation and estimate engine.
3. Job card.
4. Production stages and wastage.
5. Customer proof approval.
6. Job profitability report.

## 6. Architecture Direction

6.1. Keep one platform for now.

- One codebase is best until the shared foundations are mature.
- Use feature packs to enable different industries per tenant.
- Keep tenant data isolated even when modules are shared.
- Keep super-admin operations separate from tenant business workflow.

6.2. Split later only when a module becomes independently large.

- Ecommerce storefront could become a separate public app later.
- Queue workers should become separate services earlier than frontend/backend splitting.
- Mobile/desktop apps can stay reserved until the web workflows are stable.

6.3. Build a feature pack system.

- Each tenant has industry pack assignments.
- Each pack declares modules, routes, policies, document types, settings, reports, and terminology.
- Packs can share common modules but own vertical-specific workflows.

6.4. Keep shared primitives clean.

- Contacts, products, stock, accounts, documents, payments, files, comments, tasks, reports, notifications, and audit logs should be reusable.
- Avoid copying a full module for each industry unless the behavior is truly different.

## 7. Later Focus

7.1. Scale and hosting.

- Per-tenant database backup scheduling.
- Optional per-tenant database server placement for high-value customers.
- Read replicas for reporting if needed.
- Object storage for files and backups.
- CDN for storefront assets.

7.2. Developer and release workflow.

- CI checks for typecheck, build, lint, migrations, and tests.
- Release notes generated from versioned changes.
- Staging environment with production-like MariaDB and Redis.
- One-click smoke test after deployment.

7.3. Customer onboarding.

- Tenant setup wizard.
- Industry pack selector.
- Data import templates.
- Opening balance import.
- Domain verification.
- Default roles, reports, and document templates per industry.

7.4. Support and admin desk.

- Ticketing.
- Bug reports.
- Client notes.
- Update history.
- Failed job triage.
- Tenant health timeline.

## 8. Recommended Next Work Order

1. Finish tenant isolation and permission enforcement.
2. Prove database backup/restore with dry-run and retention.
3. Complete queue workers for backup, reports, mail, and update.
4. Move workers into a separate process/container.
5. Add migration manager visibility and update preflight checks.
6. Build accounts foundation.
7. Build industry pack system.
8. Build billing/trading pack first because it feeds many customer types.
9. Add ecommerce, auditor office, sports club, garment, and offset packs in that order based on active customer demand.

## 9. Decision

CXSun should remain one multi-tenant platform now. The near-term problem is not that the product has too many business types; the problem is that the shared foundation must become strict, observable, and recoverable. Once tenant isolation, accounts, queues, backups, updates, and feature packs are strong, the same platform can serve ecommerce, billing, auditor office, sports club, garment manufacturing, and offset billing without splitting too early.
