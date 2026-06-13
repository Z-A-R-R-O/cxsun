# Changelog

## Version State

- **Current version:** `1.0.99`
- **Release tag:** `v-1.0.99`
- **Changelog label:** `v 1.0.99`

Historical changelog entries are immutable. A version bump may update this `Version State` block and add a new entry, but it must not rewrite old entry labels.

---

## v-1.0.99

### [v 1.0.99] 2026-06-13 7:47 pm - ZETRO backend query connection layer

- Bumped workspace version to 1.0.99
## v-1.0.98

### [v 1.0.98] 2026-06-13 4:05 pm - cloud reinstall startup fix

- Bumped workspace version to 1.0.98
- Added streaming database setup logs for master migrations, master seeds, tenant provisioning, and migration queue enqueue during cloud/local Docker reinstall.
- Added a 30s tenant provisioning timeout to the migration manager setup path and runtime startup provisioner so a stuck tenant database step fails with a concrete message instead of leaving deploy logs idle.
- Lazily loaded tenant database provisioning from the migration manager to keep setup away from startup import cycles.
- Recreated the frontend public storage link during container startup so Linux Docker volumes do not inherit a broken Windows junction at `apps/frontend/public/storage`.
- Verified local Docker reinstall with MariaDB and Redis: dependency install, database setup, backend build, frontend TypeScript build, Vite bundle, backend health, frontend preview, and super-admin login smoke test.

## v-1.0.97

### [v 1.0.97] 2026-06-13 3:48 pm - ZETRO business query APIs

- Bumped workspace version to 1.0.97
- Added tenant-aware ZETRO read-only tools for customer/contact balances and supplier/contact balances.
- Added sales invoice detail and purchase bill detail lookup tools with item-line output when a single matching document is found.
- Added clarification handling so ZETRO asks for a contact name, invoice number, or bill number before running underspecified data queries.
- Kept all ZETRO business lookups scoped to the authenticated tenant, default company, and default accounting year when available.
- Updated ZETRO user, system, policy, admin review docs, and the execution task list for the expanded backend query layer.

## v-1.0.96

### [v 1.0.96] 2026-06-13 3:35 pm - billing quotation report

- Bumped workspace version to 1.0.96
- Added a Billing Quotation Report under Billing > Report.
- Added customer, date range, and billed/unbilled/all status filters for quotation reporting.
- Added billed and unbilled quotation sections with generated Sales invoice references for billed quotations.
- Added printable quotation report summary cards and detailed quotation totals for quantity, taxable value, tax, and grand total.
- Wired the report into the dashboard route and Billing report menu.
- Verified with frontend typecheck and active production build.

## v-1.0.95

### [v 1.0.95] 2026-06-13 3:01 pm - deploy build observability and startup logs

- Bumped workspace version to 1.0.95
- Added a timed active build runner so `npm run build:active` prints backend, frontend, and total build durations.
- Added frontend build phase logging for the TypeScript project build and Vite production bundle.
- Scoped the frontend React Compiler Babel pass to `apps/frontend/src` and disabled Babel source-map generation for that pass.
- Added timed deploy steps to `update.sh`, including backup, Git sync, install, migration, build, and restart phases.
- Removed the redundant `npm update --workspaces` before `npm ci` in `update.sh` to avoid slow lockfile-discarded install work.
- Added timed cloud reinstall steps for Docker image build, workspace seeding, container start, dependency install, database setup, build cleanup, and active build.
- Added backend/frontend process IDs and recurring backend health-wait progress logs during container startup.
- Fixed the cloud `db:setup` startup blocker by removing top-level circular imports between database connection, tenant database access, AuthRepository, TenantContextService, and common modules.
- Verified active production build timing locally: backend build around 11s, frontend TypeScript around 23s, Vite bundle around 36s, total around 70s.
- Verified shell syntax for `update.sh`, `.container/setup-cloud.sh`, and `.container/entrypoint.sh`.

## v-1.0.94

### [v 1.0.94] 2026-06-13 10:19 am - ZETRO role-aware docs and user restrictions

- Added a dedicated `ZRO/ZETRO/docs` documentation system with user, admin, policy, and system sections.
- Changed ZETRO markdown search to filter sources by audience so user/public surfaces only receive approved user and policy docs.
- Split ZETRO behavior into restricted user/super-admin modes with provider, model, API setup, and recommended technical updates hidden from all non-super-admin roles.
- Added restricted-topic handling for legal, GST/tax, e-invoice/e-way, medical, investment, secrets, and compliance questions.
- Updated the public ZETRO read screen and chat/base UI so model details and recommended updates are super-admin-only.
- Fixed the ZETRO fetch/preflight issue by allowing the new role/audience headers through CORS.
- Added server-side Agent OS guards so status, chat, provider setup, docs indexing, and history endpoints use the verified auth token role instead of trusting client headers.
- Tightened full ZETRO access to `super-admin` only; tenant admins/managers and non-super platform roles now receive the same restricted user behavior.
- Added ZETRO to the super-admin side menu and wired it to the existing `/sa/app-agent-os-base` page.
- Locked ZETRO runtime documentation search to the dedicated `ZRO/ZETRO` docs boundary.
- Added approved read-only tenant query handling for sales and purchase summaries, including contact/customer/supplier filters.
- Added super-admin query-insights review for recent client questions, mapped intents, and repeated query patterns.
- Added strict client-chat boundaries against source code, files, tables, prompts, provider/model details, event bus details, and unrelated topics.
- Split the super-admin ZETRO base screen into focused pages for Base, Providers, Knowledge, Agents, Queries, and Updates.
- Fixed ZETRO fetch flow failures by removing circular tenant-context DI metadata reads, bounding tenant provisioning during startup, and making Learn/API test payload errors surface correctly in the frontend.
- Forced public docs/search into public audience mode and blocked normal users from global conversation history until user-scoped memory exists.
- Verified backend and frontend typechecks after the role-aware docs and behavior changes.

### [v 1.0.93] 2026-06-13 9:32 am - ZETRO OpenCode API connection

- Bumped workspace version to 1.0.93
- Added OpenCode Zen as a first-class ZETRO API provider alongside OpenRouter, OpenAI/GPT, Gemini, and custom OpenAI-compatible providers.
- Added `OPENCODE_API_KEY` and `OPENCODE_BASE_URL` environment fallbacks, with the default base URL set to `https://opencode.ai/zen/v1`.
- Added OpenCode Zen to the ZETRO dashboard AI platform manager with editable base URL and model IDs.
- Updated ZRO and assist Agent OS docs to record the OpenCode provider path and current `/chat/completions` transport boundary.
- Verified backend and frontend TypeScript surfaces after the provider addition.

## v-1.0.92

### [v 1.0.92] 2026-06-11 - Dynamic Sales Types and Accounts menu polish

- Bumped workspace package/display versions to 1.0.92 to match the documented release state.
- Added tenant-maintained Sales Types as a common master with `Sales Account` as the default normal sales type.
- Wired Sales entry posting to use dynamic Sales Type names while preserving old saved sales category compatibility.
- Updated the Sales form to load Sales Type options dynamically instead of hard-coded Fabric/Garment/Export sales values.
- Reordered the Accounts side menu so Accounting appears first and Books contains Cash Book, Bank Book, Chart of Accounts, and Day Book.
- Verified the logged-in browser flow for Sales Types and the Sales form dynamic dropdown.

### [v 1.0.92] 2026-06-11 - Accounts pending posting completion

- Split Receipt and Payment posting into cash/bank, customer/supplier, TDS, discount, and round-off ledger lines instead of net-only postings.
- Added posting-backed Accounts Cash Book and Bank Book APIs and frontend pages while keeping Billing legacy book screens intact.
- Added client-facing Sales/Purchase posting controls for Auto Post and category selection using business labels.
- Updated Accounts chart/report labels so Customers, Suppliers, Sales, Purchases, and Taxes are shown instead of auditor-only group names where appropriate.
- Verified with backend/frontend typechecks, backend build, frontend build, and diff hygiene.

### [v 1.0.92] 2026-06-11 - Tally-like Accounts posting bridge

- Added optional accounting posting mode, category, and ledger override fields to Sales and Purchase entries/items without replacing existing entry behavior.
- Added Tally-like Sales and Purchase source posting into Accounts vouchers, voucher lines, and ledger postings.
- Added default programmatic ledgers for Fabric Sales, Garment Sales, Export Sales, Fabric Purchase, Garment Purchase, Accessories Purchase, GST, and Round Off fallback handling.
- Added source posting audit records and monthly posting rollups for report/dashboard-friendly totals.
- Added backend posting rollup rebuild trigger at `POST /api/v1/accounts/postings/rebuild`.
- Wired Sales/Purchase create, update, suspend, and restore flows to create, replace, or cancel source-linked postings.
- Verified with server typecheck/build and frontend typecheck.

### [v 1.0.92] 2026-06-10 1:56 pm - Accounts Indian accounting engine

- Bumped workspace version to 1.0.92
- Verified current Accounts backend/frontend module and dashboard wiring.
- Replaced `apps/server/src/modules/accounts/ACCOUNTS.md` with a detailed Indian accounting engine plan.
- Added account groups migration and Indian default chart of accounts seeding.
- Added normalized account vouchers, voucher lines, and postings tables.
- Added balanced manual journal/contra posting APIs with debit-credit validation.
- Added Day Book, Ledger Statement, Trial Balance, Profit & Loss, and Balance Sheet backend report APIs.
- Added the frontend Accounts overview, chart, voucher, and report desk pages with dashboard routing.
- Wired Receipt and Payment entries into Accounts with source-linked posted vouchers and active/deactivated postings.
- Ran backend typecheck and build.

---

## v-1.0.91

### [v 1.0.91] 2026-06-09 1:56 pm - Frappe integration foundation

- Added a first-class tenant Frappe app foundation with dashboard app switch, side menu, breadcrumb routing, and a connection settings desk.
- Added tenant Frappe tables for settings, sync jobs, and record activity, with provisioning wired into tenant database startup.
- Added backend Frappe workspace, settings save, live token/secret handshake, DocType read, DocType post, and sync-job APIs.
- Added frontend Frappe connection, handshake status, DocType workbench, sync job list, and record activity views.
- Reset assist planning/task notes around the Frappe handshake-first integration slice.

### [v 1.0.91] 2026-06-09 1:56 pm - Nginx tenant CLI

- Bumped workspace version to 1.0.91
- Added a repo-owned Python CLI under `.container/cli` for repeated tenant Nginx site setup.
- Generated CXSun tenant vhosts with `/storage/`, `/api/`, `/health`, and frontend proxy routing aligned to backend port `6005` and frontend port `6010`.
- Added SSL-ready vhost rendering with a temporary HTTP setup path so first-time Certbot issuance can run before the final HTTPS redirect config is written.
- Added safe operator options for dry-run, force overwrite, custom aliases, backend/frontend ports, Nginx test/reload skips, and explicit `--www` handling.
- Set no-`www` as the default domain behavior, with `--www` used only when a domain should include a `www.<domain>` alias.
- Documented CLI usage in `.container/cli/README.md` and linked the helper from the container Nginx/deploy docs.
- Verified the helper with Python compile checks and dry-run output for root domains, root domains with `--www`, and subdomains.

## v-1.0.90

### [v 1.0.90] 2026-06-09 9:49 am - TConnect marketplace boundary

- Bumped workspace version to 1.0.90
- Added the central `tconnect` marketplace tenant/domain mapping for `tconnect.local`, `www.tconnect.local`, and `tconnect.local`.
- Split the TConnect data boundary so client tenants keep only their supplier and product source profiles while the TConnect domain owns RFQs, leads, messages, memberships, analytics, events, and news.
- Added tenant-to-marketplace publish APIs for supplier and product profiles, with central marketplace review queues for approve/reject handling.
- Added public read-only APIs for approved supplier and product listings from the central marketplace tenant.
- Rendered approved supplier and product marketplace listings on the public TConnect page.
- Registered the TConnect tenant provisioning, overview/settings API, dashboard navigation, and public landing route as the foundation for the isolated marketplace.
- Reset the assist planning and task documents around the new isolated TConnect marketplace boundary.
- Verified with server typecheck, frontend typecheck, and the tenant static content smoke test.

## v-1.0.89

### [v 1.0.89] 2026-06-09 7:18 am - Quotation invoice reference column

- Added an Invoice Ref column to the Quotation list.
- Shows the generated Sales invoice number from the quotation checkpoint, making invoiced quotations easier to trace.

### [v 1.0.89] 2026-06-09 7:10 am - Quotation invoice checkpoint

- Added a quotation invoice checkpoint that marks source quotations as `invoiced` after draft Sales invoice generation.
- Stored generated Sales invoice UUID/number on each source quotation and stored quotation source metadata on the Sales invoice.
- Blocked already-invoiced quotations from edit and repeat invoice generation until the generated Sales invoice is suspended.
- Added Sales invoice suspend handling that releases linked quotations back to `posted`, matching the intended remove-invoice-then-edit quotation flow.
- Added Sales show source badge and Quotation show/list locked status handling.
- Verified the lifecycle through API: generated `SAL-0029` from two quotations, duplicate generation returned HTTP 400, and suspending `SAL-0029` released both quotations back to `posted`.

### [v 1.0.89] 2026-06-09 6:50 am - Quotation print wording

- Changed Quotation print preview title from `TAX INVOICE` to `QUOTATION`.
- Changed the printed document number label to `Quotation No:`.
- Hid the Ship To address block on Quotation print preview while keeping Sales invoice print unchanged.
- Updated Quotation list/form wording from invoice-focused labels to quotation-focused labels.

### [v 1.0.89] 2026-06-09 6:40 am - Quotation feature toggle

- Added a client-level Sales Settings > Features toggle for Quotation.
- Wired the Quotation toggle to hide Billing > Entries > Quotation in the sidebar and Billing shortcut cards when disabled.
- Added direct-route fallback so disabled Quotation pages redirect to Billing overview, matching the existing Export Sales feature toggle behavior.

### [v 1.0.89] 2026-06-09 6:25 am - Quotation to draft sales invoice

- Added a new Quotation entry module cloned from Sales for list, show, upsert, comments, activities, print preview, and autocomplete-backed customer/product/common lookups.
- Added tenant quotation tables with `QUO-0001` style numbering and dashboard Billing > Entries navigation.
- Added multi-select quotation invoice generation from the Quotation list with contact filtering and same-contact validation.
- Consolidated matching quotation item lines by product/details/rate/discount/tax and created a draft Sales invoice with selected quotation numbers in the reference field.
- Verified API generation with two same-contact quotations and confirmed mixed-contact selections return validation failure.
- Smoke-tested the Quotation list UI in the app: contact filter, row selection, selected count, and Generate Invoice enablement.

### [v 1.0.89] 2026-06-09 5:34 am - Sales invoice extended print pagination

- Added a separate extended Sales invoice print template for invoices that exceed the existing 12-line item budget.
- Kept the existing Sales invoice print layout unchanged for 12 or fewer item rows.
- Made extended Sales invoice item-only pages carry up to 24 rows before moving the totals, amount in words, footer, jurisdiction, and signature block to the next page.
- Added `To be continued...` on item-only pages and `Carry forward from previous page` on continuation/final pages.
- Verified temporary API-created invoices with 15, 19, and 24 item rows against A4 print-media page-height checks.

### [v 1.0.89] 2026-06-08 2:15 pm - Sales show page new action

- Bumped workspace version to 1.0.89
- Added a top-right New action to the Sales show page that opens a blank Sales upsert form.
- Matched the New action's compact `rounded-md` styling with the Sales list-page action.

## v-1.0.88

### [v 1.0.88] 2026-06-08 9:18 am - Tally master sync defaults

- Bumped workspace version to 1.0.88
- Added contact edit resync controls and Tally contact sync resync support for already-synced contacts.
- Fixed Tally contact ledger sync to persist mailing address lines, city, state, country, pincode, and GST registration details through TallyPrime mailing/GST detail lists.
- Added product inventory master sync for Tally stock items with product group, unit, HSN, GST type of supply, taxable rate details, and post-import verification.
- Added Tally default unit/UQC bootstrap with GST UQC mappings and a Product Sync action to create or repair default unit masters before item sync.
- Expanded common unit seed defaults to match the Tally UQC list used by inventory master sync.

## v-1.0.87

### [v 1.0.87] 2026-06-07 11:59 pm - Tally handshake and master sync

- Bumped workspace version to 1.0.87

- Added the Tally integration app surface with handshake-first validation, dedicated Handshake and Desk views, and side-menu groups for Master Sync and Entry Sync.
- Added strict Tally company validation against the company list and exact selected company object before enabling sync operations.
- Added persistent `tally_sync_links` tracking for contact, product, sales, and purchase sync state.
- Added Contact Sync and Product Sync pages with filters, status badges, selectable rows, select-all, and selected-only sync actions.
- Added reusable Sales Sync and Purchase Sync readiness checks that block entry queueing until required contact and product masters are synced.
- Added direct Tally master export for customer/supplier contacts as ledgers under Sundry Debtors and Sundry Creditors, including GSTIN and address details.
- Added direct Tally product export as stock items with unit and HSN details.
- Fixed Tally XML import to use the accepted `Import` envelope and hardened XML parsing for object names and master IDs.
- Fixed sync failure persistence so Tally XML/error excerpts are safely stored in JSON columns instead of causing backend `500` errors.
- Verified Tally contact sync live against the local Tally company `Sundarcomputers`, including synced ledger statuses and stored master IDs.

## v-1.0.86

### [v 1.0.86] 2026-06-07 9:35 pm - CRM pipelines and Task Manager workspace updates

- Bumped workspace version to 1.0.86
- Added a tenant-global CRM backend module with pipelines, pipeline stages, leads, and deals.
- Added CRM tenant migrations, default sales pipeline/stage creation, and API routes for list, upsert, and delete workflows.
- Wired CRM Leads, Deals, and Pipeline pages into the dashboard side menu with list dialogs, deal tables, and a pipeline board.
- Extended Task Manager show pages with Events, Attachments, Comments, Sub Tasks, and Activity tab refinements.
- Added Task Manager event scheduling, image attachment preview, serial numbering across work tabs, and authenticated private-media previews.
- Verified the active server and frontend TypeScript surfaces after the CRM and Task Manager updates.

## v-1.0.85

### [v 1.0.85] 2026-06-06 9:47 pm - Auditor client workspace and inline credential editing

- Bumped workspace version to 1.0.85
- Added the Auditor app desk, breadcrumb routing, side menu, and full Auditor Client backend/frontend module.
- Added animated Client, Contact, Address, and Credentials tab groups to Auditor Client show and upsert pages.
- Added searchable State, City, and Pincode master autocomplete lookups with dependent filtering and persisted lookup IDs.
- Added client contact, address, GST, E-Invoice, E-Way, API, and email account credential fields.
- Added independent inline editing and saving for every credential row on the Client show page.

## v-1.0.84

### [v 1.0.84] 2026-06-06 7:38 pm - Company industry assignment and sales print controls

- Bumped workspace version to 1.0.84
- Added a super-admin Company Industry page for assigning active industry profiles to companies across tenant workspaces.
- Synchronized company industry assignments with default-company context and seeded tenant company records.
- Added the missing Rate column to Sales invoice print, including fitted column widths and aligned totals.
- Added configurable logo left and top positions to the Sales Settings letterhead designer and shared print renderer.
- Merged Sales item description, colour, and size into one continuously wrapping Particulars cell, reclaiming space from separate Colour and Size columns.
- Hidden placeholder Colour and Size values such as `1` and `-` from Sales print Particulars.
- Removed the Sales UUID fallback from printed IRN details and hid empty IRN, acknowledgement, and E-way compliance sections.
- Updated deployment documentation with the latest tenant domain and Nginx configuration examples.

## v-1.0.83

### [v 1.0.83] 2026-06-06 10:12 am - Task Manager priority and show page rework

- Bumped workspace version to 1.0.83
- Reworked the New Task dialog with a compact layout, TipTap rich-text subject editor, and tenant-user-only assignment autocomplete.
- Added reusable Common Priorities with name, colour, and stable tag fields, seeded default priorities, and exposed Priority maintenance under Common -> Others.
- Replaced hard-coded task priorities with shared priority tags, coloured dots, task-list badges, and name/tag search support.
- Added fast priority creation directly from the priority autocomplete, automatically generating the current tag and a default random colour.
- Rebuilt the Task Show page with animated Details and Activity tabs, full-width content cards, all task metadata, status controls, and a dedicated activity timeline.

## v-1.0.82

### [v 1.0.82] 2026-06-06 8:38 am - Export sales currency and feature controls

- Bumped workspace version to 1.0.82
- Added Common Currency selection and persistence to Export Sales, with Currency shown and searchable in the main list.
- Added Export Sales totals to Billing Overview cards and the financial-year month summary table.
- Added a company-published Export Sales feature switch under Sales Settings -> Features.
- Wired the Export Sales feature switch across Billing navigation, shortcuts, overview metrics/month table, direct route access, and Document Settings.
- Made Billing overview metric cards fill the available width when Export Sales is disabled.
- Synchronized the assist README, architecture and coding rules, verification guidance, product context, billing gap analysis, session plan, task list, and work log with the current Export Sales, GST/GSP, accounting-year, print-mail, feature-visibility, and tenant-domain behavior.
## v-1.0.81

### [v 1.0.81] 2026-06-06 7:33 am - Export sales and accounting-year dashboard

- Bumped workspace version to 1.0.81
- Added Export Sales as a separate Billing entry module with its own list, show, upsert, comments, activities, suspend/restore, GST actions, and exact invoice print workflow.
- Added dedicated export-sales tenant tables and API routes, keeping export invoices isolated from domestic sales records.
- Added separate Export Sales document numbering with the `exportSales` kind and default `EXP` prefix, configurable from Document Settings.
- Wired Export Sales PDF email delivery through the existing tenant mail queue and exact visible print capture.
- Added Export Sales to the Billing Entries side menu and lazy-loaded dashboard routing.
- Fixed Billing Overview totals, recent transactions, animated monthly chart, and summary table to follow the selected company and accounting-year start/end period.
- Filtered Sales, Purchase, Receipt, Payment, Cash Book, and Bank Book lists by both the selected company and selected accounting year.

## v-1.0.80

### [v 1.0.80] 2026-06-05 9:38 am - Entry PDF email delivery and attachment visibility

- Bumped workspace version to 1.0.80
- Activated Send to Email from Sales, Purchase, Receipt, and Payment show pages through the existing tenant SMTP mail queue.
- Changed entry email attachments to render the exact visible print document with Chromium, preserving letterhead, logo, GST details, QR/barcodes, selected print copies, A4 margins, and print pagination.
- Stored generated PDFs temporarily under each tenant's `storage/<tenant>/public/pdf` folder, retained files for delivery retries, and removed them after successful SMTP delivery.
- Added Chromium and the required Playwright renderer configuration to the cloud container.
- Added clean PDF attachment filenames to the HTML and text email body, while keeping unique internal temporary storage paths.
- Persisted temporary PDF attachment metadata without storing PDF contents in the database, and prevented metadata-only rows from creating duplicate empty SMTP attachments.
- Added Mail Desk paperclip indicators, attachment counts, and attachment filename, MIME type, and size details in the mail show popup.

## v-1.0.79

### [v 1.0.79] 2026-06-05 12:06 am - Billing financial year overview

- Bumped workspace version to 1.0.79
- Changed Billing Overview transaction movement from calendar-month order to financial-year order, showing Apr through Mar.
- Matched Billing Overview summary totals, this-month totals, monthly bars, and recent transactions to the same current financial-year range.
- Made the Billing Overview total cards clickable shortcuts to Sales, Purchase, Receipts, and Payments list pages with a small hover lift animation.
## v-1.0.78

### [v 1.0.78] 2026-06-04 10:50 pm - Billing chart runtime fix

- Bumped workspace version to 1.0.78
- Fixed the Billing Overview Recharts runtime crash by removing explicit Y-axis components that triggered an undefined `allowDataOverflow` axis read in the generated chart bundle.
- Kept the Billing Overview transaction charts active with shadcn chart containers, X-axis labels, grid lines, tooltips, transaction movement lines, and GST bars.
- Replaced the Billing Overview chart surface with custom animated SVG bars, removed duplicate mini totals from Transaction Movement, clipped Recent Transactions to match chart height, and made recent rows open their matching sales, purchase, receipt, or payment show page.
- Polished Billing Overview summary cards with cleaner spacing, hidden bill counts, colorful transaction icons, and distinct receipt/payment icons.
## v-1.0.77

### [v 1.0.77] 2026-06-04 10:34 pm - Billing overview transaction dashboard

- Bumped workspace version to 1.0.77
- Reworked tenant app overview routing so every enabled desk has a top-level Overview shortcut, with Application, Billing, Accounts, and other app overviews staying inside their own desk.
- Restored desk-style overview headers with matching app icons and shortcut cards while removing the generic Apps, Companies, Roles, and Clean Boundary cards from tenant overviews.
- Added a Billing Overview transaction dashboard that loads current accounting-year sales, purchase, receipt, and payment records, then shows this-year and this-month counts and INR totals.
- Added shadcn/Recharts visualizations for monthly transaction movement and GST output/input/net totals on the Billing Overview.
- Simplified the Accounts app side menu to direct Cash Book and Bank Book entries, matching the Billing desk accounts menu and preserving the existing accounts routes.
- Replaced visible tenant-facing shell labels with workspace wording across the dashboard sidebar, notifications, landing-desk helper text, mail copy, and workspace-user helper text.
## v-1.0.76

### [v 1.0.76] 2026-06-04 9:43 pm - Industry datetime cloud save fix

- Bumped workspace version to 1.0.76
## v-1.0.75

### [v 1.0.75] 2026-06-04 9:25 pm - Industry datetime cloud save fix

- Bumped workspace version to 1.0.75
- Limited billing entries and statement/GST reports to the tenant default accounting year, so switching the default year shows that year's records.
- Changed list pagination defaults to 100 rows, fixed natural document-number sorting, and added supplier bill number to the purchase list.
## v-1.0.74

### [v 1.0.74] 2026-06-04 8:51 pm - Disable automatic tenant domain seeding

- Bumped workspace version to 1.0.74
- Added guarded permanent deletion for tenant domains, with normal delete blocked for active/primary mappings and a typed force-delete confirmation for verified cleanup.
- Fixed industry upsert timestamps to use MySQL `DATETIME` format, preventing cloud 500 errors when saving industries.
## v-1.0.73

### [v 1.0.73] 2026-06-04 7:04 pm - GST WhiteBooks compliance release

- Bumped workspace version to 1.0.73
- Disabled automatic tenant-domain creation during Docker/cloud updates by default; tenant domains now require manual Super Admin configuration unless `AUTO_SEED_TENANT_DOMAINS=true` is explicitly set.
## v-1.0.72

### [v 1.0.72] 2026-06-04 - GST WhiteBooks GSP compliance wiring

- Split WhiteBooks GSP credentials into super-admin managed sandbox/production tabs with separate E-invoice + E-way and E-way-only credential cards.
- Moved GSP credential lookup to database-backed global settings, while tenant GST API settings keep only tenant username, password, GSTIN, and sandbox/production selection.
- Wired sales E-invoice and E-way generation to merge global GSP credentials with tenant GST credentials, save IRN/ack/signed QR/e-way details back to sales, and print the saved e-way bill as a Code 128 barcode.
- Fixed GST token-status polling so incomplete or disabled settings return a no-token state instead of noisy 400 responses.
- Added `office.aaran.org` to Vite dev/preview allowed hosts for cloud access.

### [v 1.0.72] 2026-06-04 9:47 am - created account module

- Bumped workspace version to 1.0.72
## v-1.0.71

### [v 1.0.71] 2026-06-03 7:23 pm - Added the cloud update fix

- Bumped workspace version to 1.0.71
## v-1.0.70

### [v 1.0.70] 2026-06-03 7:01 pm - document number auto-advance fix

- Bumped workspace version to 1.0.70
- Released the document-number auto-advance fix for sales, purchase, receipt, and payment vouchers.
- Kept the `codexsun` e2e verification note from the completed fix batch.
- Fixed the cloud update `db:setup` crash by lazy-loading the master queue/hybrid queue path, removing the circular startup reference during migrations.

## v-1.0.69

### [v 1.0.69] 2026-06-03 - document number auto-advance fix

- Fixed sales, purchase, receipt, and payment document numbering so New forms fetch the next automatic number after saves instead of reusing stale previews.
- Aligned document-number context resolution with the entry save flow by using the tenant primary company and active accounting year.
- Added backend reconciliation against existing vouchers so document settings advance past already-used numbers, including manual overrides and concurrent saves.
- Verified the `codexsun` tenant flow with `admin@tenant.com`: existing sales through `SAL-0005` now produce `SAL-0006` on New Sales.

### [v 1.0.69] 2026-06-03 10:08 am - mail workspace list polish

- Reworked the tenant Mail Inbox to match the existing Sales-style workspace with top `Refresh` and `New` actions, a search/filter/column toolbar, table card, row action dropdown, and pagination.
- Added a mail view dialog from the table action menu and kept trash actions available from both row and selected-message flows.
- Removed the duplicate inner Mail sidebar so Mail Desk navigation lives only in the main application side menu.
- Logged the tenant mail module build and live SMTP verification in the assistant work log.

### [v 1.0.69] 2026-06-03 - tenant mail desk and queue sender

- Added a tenant-aware Mail app with outbox, draft inbox, compose, attachments, and tenant SMTP settings pages.
- Added tenant mail tables, `mail.manage` policy seeding, mail APIs, and SMTP delivery through the existing `mail` queue lane.
- Replaced the placeholder mail queue worker with a real dispatcher that updates mail message status and queue results.

### [v 1.0.69] 2026-05-30 5:55 pm - home story carousel

- Converted the Home story banner into an auto-advancing right-to-left carousel with three Codexsun story slides.
- Added outside left and right chevron controls plus slide dot navigation for manual story browsing.

### [v 1.0.69] 2026-05-30 5:49 pm - codexsun visual identity pass

- Replaced the copied contour-style public Home backgrounds with Codexsun-specific angular grid, sun-highlight, sky, teal, amber, and emerald visual treatments.
- Updated section icons and CTA colours so the brand intro, featured workspace, values, and footer feel distinct from the sample reference.

### [v 1.0.69] 2026-05-30 5:47 pm - public home page brand polish

- Rebuilt the Codexsun public Home flow into spacious marketing sections for brand intro, featured apps, product benefits, story, values, and final call to action.
- Refined public header and footer copy so the site reads as a customer-facing brand page instead of exposing internal runtime/status details.
- Added horizontal overflow clipping around reveal animations and verified the public page sections render at `codexsun.local`.

### [v 1.0.69] 2026-05-30 5:13 pm - slider editor polish

- Added colour picker controls beside exact CSS value inputs in the Site slider designer.
- Fixed Site slider editor select widths and dropdown layering so option menus do not visually merge with nearby fields.
- Made public slider chevrons mostly transparent by default and fully visible on hover or keyboard focus.

### [v 1.0.69] 2026-05-30 4:57 pm - codexsun home slider seed

- Seeded Codexsun with a published primary `home-slider-1` Site slider containing three Codexsun-focused slides.
- Removed the old frontend slider fallback and replaced the no-slider state with a static conscious workspace hero.
- Verified `codexsun.local` renders the database-backed `home-slider` section.

### [v 1.0.69] 2026-05-30 9:47 am - designer site slider editor

- Added a primary slider flag for tenant Site sliders and made public Home prefer the primary published home slider.
- Replaced raw slider JSON editing with a designer form for root slider details, slide list management, background image, title, tagline, badges, button content, style colours, font sizes, fonts, icon size, motion, duration, and overlay settings.
- Extended slider payload styles so title, tagline, badge, and button design options render on the public slider.

### [v 1.0.69] 2026-05-30 9:20 am - dynamic site slider sections

- Added tenant-scoped Site slider tables, repository, service, controller, events, and queue publish flow for dynamic public site sections.
- Wired public Home to render the full-screen slider from backend tenant data with a static fallback.
- Added the Sites > Sliders dashboard page with list, show/preview, and upsert flows.
- Extended tenant domain resolution with tenant database fields so public Site content can load per-tenant dynamic data.
- Kept developer section badges controlled by `DEVELOPER_MODE` and visible on Site sections in developer mode.

### [v 1.0.69] 2026-05-29 10:40 am - storage logo proxy errors

- Bumped workspace version to 1.0.69
- Awaited async controller handlers during request dispatch so missing media/static logo files return the intended HTTP error instead of surfacing as backend `500` or proxy `502` responses.
- Added public cache/resource headers to `/storage` responses and raised the Docker app `NODE_OPTIONS` HTTP header limit to tolerate larger request headers.
- Documented the Nginx `/storage/` proxy block with larger header buffers and cookie stripping to prevent same-origin logo image requests from failing with `431 Request Header Fields Too Large`.
## v-1.0.68

### [v 1.0.68] 2026-05-29 10:12 am - local setup starts mariadb

- Bumped workspace version to 1.0.68
- Starts the bundled MariaDB compose service from `setup-local.sh`, waits for `mariadb-admin ping`, and passes local DB defaults into CXSun before app startup.
- Fixed local Docker setup leaving `cxsun` in a restart loop at `db:setup` when no external MariaDB container was already running.
## v-1.0.67

### [v 1.0.67] 2026-05-29 10:05 am - cxmedia root volume permissions

- Bumped workspace version to 1.0.67
- Runs the CXMedia File Browser container as root inside Docker so it can access the shared `cxmedia-storage` volume written by the app container.
- Initializes `/srv` and `/database` with writable mount points and pins the File Browser database config to root `/srv` with admin scope `/`, fixing `403 Forbidden` after login.
## v-1.0.66

### [v 1.0.66] 2026-05-29 9:58 am - cxmedia admin root scope

- Bumped workspace version to 1.0.66
- Changed the CXMedia File Browser admin scope from `/srv` to `/`, because File Browser scopes are relative to the configured root directory.
- Fixed clean media setup failing with `failed to create user home dir: [/srv]` and restored admin access to the mounted media root.
## v-1.0.65

### [v 1.0.65] 2026-05-29 9:53 am - pass cxmedia password to user cli

- Bumped workspace version to 1.0.65
- Passed `CXMEDIA_ADMIN_PASSWORD` into the File Browser user add/update CLI container, fixing empty-password handling during CXMedia clean reinstall.
## v-1.0.64

### [v 1.0.64] 2026-05-29 9:50 am - ensure cxmedia scope directory

- Bumped workspace version to 1.0.64
- Updated CXMedia user setup to run File Browser CLI through a shell that creates `/srv` before user add/update.
- Passed `CXMEDIA_ADMIN_PASSWORD` into the one-off CLI container so admin password reset uses the configured value.
## v-1.0.63

### [v 1.0.63] 2026-05-29 9:46 am - mount media volume during cxmedia user setup

- Bumped workspace version to 1.0.63
- Mounted `cxmedia-storage` at `/srv` during File Browser CLI user setup so admin scope creation works after a clean DB reinstall.
- Fixed CXMedia setup failing with `failed to create user home dir: [/srv]`.
## v-1.0.62

### [v 1.0.62] 2026-05-29 9:20 am - cxmedia permissions and tenant logo fallback

- Bumped workspace version to 1.0.62
- Updated CXMedia admin setup to set `/srv` scope and full create/delete/download/modify/rename/share permissions, fixing File Browser access-denied after login.
- Added tenant-only logo rendering for the Application sidebar so missing or temporarily unavailable tenant logos no longer swap to the default fallback icon.
- Updated the shared letterhead logo rendering to skip fallback logos and show only the tenant/company logo when available.
## v-1.0.61

### [v 1.0.61] 2026-05-29 8:46 am - cxmedia password length fix

- Bumped workspace version to 1.0.61
- Changed the default CXMedia admin password to `Sundarcomputers@123` so it satisfies File Browser's minimum password length rule.
- Updated compose, setup scripts, env sample, and install docs to use the new CXMedia password default.
## v-1.0.60

### [v 1.0.60] 2026-05-29 8:36 am - initialize cxmedia database before user setup

- Bumped workspace version to 1.0.60
- Added an explicit File Browser `config init` step before creating/updating the CXMedia admin user after a clean DB volume reinstall.
- Fixed clean CXMedia reinstall failing when `/database/filebrowser.db` did not exist yet.
## v-1.0.59

### [v 1.0.59] 2026-05-29 8:26 am - fix cxmedia create command

- Bumped workspace version to 1.0.59
- Removed the unsupported `--no-deps` flag from the `docker compose create cxmedia` command for compatibility with the server Compose version.
## v-1.0.58

### [v 1.0.58] 2026-05-29 8:23 am - clean cxmedia reinstall mode

- Bumped workspace version to 1.0.58
- Reworked `.container/setup-media.sh` with explicit normal setup, clean reinstall, and optional uploaded-media wipe modes.
- Added crash-proof handling so setup attempts to leave or restart CXMedia if a password/database maintenance step fails.
- Clean reinstall now stops/removes the `cxmedia` container and recreates the File Browser DB volume while preserving `cxmedia-storage` by default.
- Added `--wipe-media` as an explicit opt-in when uploaded media should also be removed.
## v-1.0.57

### [v 1.0.57] 2026-05-29 8:16 am - reliable cxmedia password reset

- Bumped workspace version to 1.0.57
- Changed `.container/setup-media.sh` to stop CXMedia before editing the File Browser database, avoiding failed password updates while the DB is open.
- Updated the media setup password step to run the official File Browser CLI against the mounted `cxmedia-db` volume and add the admin user if it is missing.
- Restarted CXMedia after the password reset so `admin` / `Admin@12345` is reliably available.
## v-1.0.56

### [v 1.0.56] 2026-05-28 7:48 pm - separate cxmedia setup script

- Bumped workspace version to 1.0.56
- Added `.container/setup-media.sh` as the standalone CXMedia installer/starter with persistent volumes and default admin password handling.
- Changed cloud and local setup to only check/start CXMedia, running media setup once only when the `cxmedia` container is missing.
- Changed storage restore and workspace seeding helper containers to use `alpine:3.20` instead of `cxsun:v1`, preventing app entrypoint clone/start behavior during setup copy steps.
## v-1.0.55

### [v 1.0.55] 2026-05-28 7:37 pm - cxmedia default admin password

- Bumped workspace version to 1.0.55
- Set the CXMedia File Browser default admin login to `admin` / `Admin@12345` for new installs.
- Added `CXMEDIA_ADMIN_PASSWORD` deploy/env support so the default password can be overridden.
- Updated setup to refresh the existing CXMedia `admin` password when the container already exists.
- Documented CXMedia compatibility as the mounted file manager for the shared `cxmedia-storage` media volume.
## v-1.0.54

### [v 1.0.54] 2026-05-28 7:01 pm - seed workspace volume from local repo

- Bumped workspace version to 1.0.54
- Seeded the app workspace Docker volume from the already-pulled local repository during setup, so container startup no longer waits on an internal GitHub clone.
- Excluded generated build, dependency, and storage directories while seeding the workspace volume.
## v-1.0.53

### [v 1.0.53] 2026-05-28 6:50 pm - external cxmedia compose volumes

- Bumped workspace version to 1.0.53
- Marked `cxmedia-storage` and `cxmedia-db` as external compose volumes because setup creates and preserves them outside normal app lifecycle.
- Removed the Compose warning about media volumes already existing during repeated reinstall/start runs.
## v-1.0.52

### [v 1.0.52] 2026-05-28 6:48 pm - preserve mounted storage during clone

- Bumped workspace version to 1.0.52
- Fixed fresh container startup with the mounted `storage` volume by cleaning only app files and preserving `/workspace/cxsun/storage`.
- Changed initial clone to use a temporary clone directory before copying the repository into `/workspace/cxsun`, avoiding Docker mount removal errors.
## v-1.0.51

### [v 1.0.51] 2026-05-28 6:42 pm - skip mariadb preflight during install

- Bumped workspace version to 1.0.51
- Skipped the MariaDB `mysqladmin ping` preflight by default during container startup so install no longer fails before the real database setup step.
- Added `SKIP_MARIADB_WAIT` to deploy env handling for compose, entrypoint, local setup, and env samples.
- Updated cloud setup to connect an existing MariaDB container named by `DB_HOST` to `codexion-network` when present.
- Kept database setup/migrations as the authoritative database connection check.
## v-1.0.50

### [v 1.0.50] 2026-05-28 6:39 pm - one time cxmedia install on reinstall

- Bumped workspace version to 1.0.50
- Changed cloud reinstall so `--reinstall` stops, removes, rebuilds, and recreates only the `cxsun` app service instead of recreating every compose service.
- Added one-time CXMedia handling: start an existing `cxmedia` container when found, install it only when missing, and reconnect it to `codexion-network` as needed.
- Preserved the existing `cxmedia-storage` and `cxmedia-db` volumes across repeated app reinstalls.
- Removed legacy temporary media containers during setup when present.
## v-1.0.49

### [v 1.0.49] 2026-05-28 6:31 pm - cxmedia file browser storage container

- Bumped workspace version to 1.0.49
- Replaced the temporary storage CDN/browser split with a single standalone `cxmedia` container using `filebrowser/filebrowser` on fixed port `6050`.
- Renamed persistent media storage to `cxmedia-storage` and File Browser metadata storage to `cxmedia-db`, while keeping the app mounted to the same uploaded media path.
- Added `VITE_MEDIA_MANAGER_URL` and a Media Manager action that opens CXMedia directly from the application.
- Added setup migration from the legacy `cxsun-storage` volume into `cxmedia-storage` so existing uploaded files are preserved during the changeover.
- Updated deploy docs and env defaults for `CXMEDIA_PORT=6050`, `CXMEDIA_STORAGE_VOLUME`, and `CXMEDIA_DB_VOLUME`.
## v-1.0.48

### [v 1.0.48] 2026-05-28 6:25 pm - external storage cdn and media manager

- Bumped workspace version to 1.0.48
- Added a persistent `cxsun-storage` Docker volume mounted into the app at `/workspace/cxsun/storage` so uploaded logos and media survive app workspace reinstalls.
- Added a separate Nginx storage CDN container for serving `/storage/...` assets from the shared storage volume.
- Added a File Browser container for browser-based upload and media management against the same storage volume, with its own persistent database volume.
- Added `VITE_STORAGE_BASE_URL` support so frontend logo and invoice media URLs can resolve through the storage CDN instead of the frontend preview origin.
- Updated cloud setup to preserve existing container storage into the persistent volume before reinstall and document production CDN/media-manager usage.
## v-1.0.47

### [v 1.0.47] 2026-05-28 4:31 pm - sales purchase totals and tenant setup safety

- Bumped workspace version to 1.0.47
- Fixed sales and purchase row totals so taxable, GST, line total, round off, and grand total use the same two-decimal calculation path while editing and before save.
- Recalculated sales and purchase totals on the backend before persistence, so saved vouchers use database-owned totals instead of trusting screen values.
- Updated sales and purchase print documents to load taxable, GST, and grand total from the saved database record while still showing row-level tax consistently.
- Added non-destructive tenant migration repair SQL to recalculate existing sales and purchase entry/item totals in place during normal setup.
- Removed the old tenant seed cleanup that suspended legacy tenant slugs and cleared `corporate_id`/mobile during setup or reinstall.

## v-1.0.46

### [v 1.0.46] 2026-05-28 3:35 pm - tenant user manager and decimal inputs

- Bumped workspace version to 1.0.46
- Added tenant user management to the Application side menu with tenant-scoped list, show, and upsert screens matching the existing tenant page tone.
- Added tenant-or-platform authorization for tenant user APIs so tenant admins and managers can manage users inside their own tenant while platform-only user routes stay protected.
- Added a company logo fallback so missing tenant logo assets do not leave the sidebar brand image broken.
- Fixed sales and purchase item entry so quantity and price accept decimal values, with price shown as two-decimal input by default.
- Fixed receipt and payment amount/allocation entry so decimal values can be entered consistently.
- Fixed sales and purchase round-off entry so signed decimal values are accepted and displayed with two decimal places by default.

## v-1.0.45

### [v 1.0.45] 2026-05-28 11:07 am - Tenant domain updated

- Bumped workspace version to 1.0.45
## v-1.0.44

### [v 1.0.44] 2026-05-28 10:35 am - tenant media isolation and letterhead designer

- Bumped workspace version to 1.0.44
- Isolated media storage by tenant with public and private paths under `storage/<tenant>/public` and `storage/<tenant>/private`, while keeping legacy reads available for existing files.
- Added fixed SVG-only company logo uploads that overwrite stable tenant files at `storage/<tenant>/public/logo/logo.svg`, `logo-dark.svg`, and `favicon.svg` regardless of the uploaded filename.
- Updated company logo settings and media picker behavior so logo uploads use the fixed tenant logo folder and stable public URLs across the application.
- Added tenant company logo resolution for app branding, sidebar branding, print headers, and report headers.
- Added a shared letterhead builder with live print preview and frontend controls for company name, address, contact, tax text, colors, sizes, spacing, and logo dimensions.
- Wired the shared letterhead into sales, purchase, receipt, payment, stock documents, and billing/GST statements so printed headers use the same tenant-specific design.

## v-1.0.43

### [v 1.0.43] 2026-05-27 9:48 am - local tenant login domain fix

- Bumped workspace version to 1.0.43
- Treated `*.local` hostnames as local development domains in tenant login validation, so `aaran.local:6010/login` can authenticate without being blocked by the production tenant-domain guard.
- Applied the same `.local` development bypass inside tenant request context validation so authenticated tenant API calls from local tenant domains keep working after login.
- Verified the fix with server typecheck, server build, and a direct tenant login check using `x-login-domain: aaran.local:6010`.

## v-1.0.42

### [v 1.0.42] 2026-05-26 10:30 pm - tenant dashboard hardening and loading polish

- Replaced dashboard/page loading fallbacks with the shared fixed global logo loader, removing loader text flicker and keeping route loading centered above the layout.
- Removed tenant-side app enable/disable switches from Landing Desk so tenant users only see enabled/disabled status, while app access remains controlled from Super Admin tenant settings.
- Hid disabled apps from the tenant app switcher and blocked disabled app routes from opening through direct navigation.
- Hardened tenant login/domain isolation so a tenant session cannot be used from a different mapped domain, with local development domains still allowed for testing.
- Added frontend session cleanup when the resolved tenant domain does not match the stored tenant session.
- Added request input sanitization before API handlers to reject unsafe query/param patterns and strip unsafe request keys/control characters before processing.
- Reduced first-load flicker by avoiding tenant-domain resolver blocking on login, admin, and dashboard routes.
- Improved dashboard responsiveness by prefetching the dashboard bundle from login and prefetching common app modules after dashboard load or app switch.
- Reduced production preflight overhead by only sending `x-login-domain` on authenticated requests when the API is cross-origin; tenant login still sends it for domain validation.
- Verified frontend and server typecheck/build, local backend health, and login API warm response around `50 ms` after initial cold connection warmup.

### [v 1.0.42] 2026-05-26 10:25 am - separate redis setup helper and queue readiness

- Fixed the app Redis readiness check to explicitly connect before pinging, so BullMQ workers do not fall back to MariaDB-only mode while the ioredis stream is still opening.
- Added `.container/setup-redis.sh` as a separate manual Redis helper for status, stop, start, restart, and clean reinstall on the same Redis ports without wiring it into cloud setup.
- Kept tenant admin seeding on `TENANT_ADMIN_NAME`, `TENANT_ADMIN_EMAIL`, and `TENANT_ADMIN_PASSWORD`, creating a normal tenant `admin` that can be adjusted manually after login.
- Added default cloud tenant admin seed values `ADMIN <admin@tenant.com>` with password `admin@123` for install and reinstall, while keeping env overrides supported.
- Changed new tenant form database defaults to let the backend use the deployed DB host, preventing cloud tenant setup from saving `localhost:3306`.

## v-1.0.40

### [v 1.0.40] 2026-05-26 9:27 am - database reset helper and deploy setup polish

- Bumped workspace version to 1.0.40
- Added `.container/reset-databases.sh` for intentional master and tenant/client MariaDB resets outside the normal reinstall path.
- Added separate typed confirmations for client database reset and master database reset so destructive cleanup cannot run accidentally.
- Made the reset helper work from hosts without local MariaDB client tools by falling back to `docker exec` against the configured MariaDB container.
- Documented the database reset helper in the container deploy guide.

## v-1.0.39

### [v 1.0.39] 2026-05-26 9:24 am - cloud reinstall health and tenant setup fix

- Bumped workspace version to 1.0.39
## v-1.0.38

### [v 1.0.38] 2026-05-26 9:09 am - cloud reinstall health and tenant setup fix

- Bumped workspace version to 1.0.38
- Fixed container reinstall restart loops by adding `curl` to the runtime image used by entrypoint and setup health checks.
- Fixed external Redis startup by reconnecting an already-running Redis container to `codexion-network` and waiting for `redis-cli ping` to return `PONG` before starting CXSun.
- Added entrypoint and local setup Redis waits so direct container and local setup starts do not race queue startup before Redis is reachable.
- Passed `HEALTH_WAIT_SECONDS` through Docker compose and `.env.sample`, and made entrypoint health waits use that configured limit.
- Updated the container deploy guide to document ordered `db:setup` and Redis readiness behavior.
- Added `.container/reset-databases.sh` for intentional, separately confirmed master and tenant/client MariaDB resets outside the normal reinstall path.
- Made the database reset script work on hosts without local MariaDB client tools by falling back to `docker exec` against the configured MariaDB container.
- Changed cloud entrypoint database bootstrap to run ordered `db:setup` instead of separate migrate and seed steps, so preserved MariaDB installs retire planned-client tenants before tenant provisioning runs.
- Restricted server startup tenant provisioning to active MariaDB tenants with `deleted_at IS NULL`, preventing suspended planned clients from being prepared during normal boot.
- Verified the fix with shell syntax checks, server typecheck, server build, and changelog whitespace checks.

## v-1.0.37

### [v 1.0.37] 2026-05-26 8:56 am - lean first install tenants

- Bumped workspace version to 1.0.37
- Reduced automatic first-install tenant seeding to only CODEXSUN Shared Billing and Aaran Associates so clean cloud installs provision two tenant databases instead of the full planned client list.
- Retired previously auto-seeded planned-client slugs during seed so old cloud databases stop resolving those domains until each tenant is created intentionally through Super Admin.
- Updated tenant static and tenant isolation tests to assert the two-tenant first-install contract and to use `codexsun.local` plus `aaran.local` sample transactions.
- Kept the full live client list as planning documentation, while documenting that future clients should be manually onboarded from Super Admin.
- Improved container startup by waiting for MariaDB before migrations, printing timestamped install steps, removing old build output before `build:active`, and skipping install-time tenant tests unless `INSTALL_RUN_TESTS=true`.
- Updated `.container/setup-cloud.sh` to stream container logs during the backend health wait and to use a configurable `HEALTH_WAIT_SECONDS` limit, reducing silent waits during npm install, migrations, seeds, and build.
- Added `INSTALL_RUN_TESTS` to Docker compose and `.env.sample` so cloud installs can choose fast default boot or explicit safety-test boot.

## v-1.0.36

### [v 1.0.36] 2026-05-26 8:38 am - cloud reinstall deployment hardening

- Bumped workspace version to 1.0.36
- Hardened `.container/setup-cloud.sh` for live cloud reinstall flow with `--fresh` and `--reinstall` as equivalent clean app reinstall options.
- Made the cloud reinstall path reset the external Redis container/cache, stop and remove the CXSun app container, remove only the CXSun workspace volume, rebuild the Docker image with `--no-cache`, and explicitly preserve MariaDB.
- Added live platform admin seed defaults for `SUNDAR <sundar@sundar.com>` and `Admin <admin@admin.com>` through deploy environment variables instead of backend hardcoded fallback credentials.
- Added JWT secret generation and persistence for first deploys, with `.container/generate-jwt-secret.sh` for manual secret creation or rotation.
- Updated Docker compose and entrypoint environment wiring for JWT, platform admin seeds, tenant admin seeds, Redis settings, queue enablement, and database backup interval settings.
- Extended the container entrypoint to run dependency install, database migrations, database seeds, tenant static tests, tenant isolation tests, production build, backend health check, and strict `codexsun.com` tenant resolver verification before considering startup healthy.
- Documented the cloud deploy and reinstall commands in `.container/README.md`, including the one-command live reinstall path and the guarantee that MariaDB is not recreated by the script.
- Marked deployment shell scripts executable and added `.gitattributes` rules so shell scripts keep Linux-safe LF line endings after Windows edits.
- Captured the live-server mismatch where `git pull` still showed the old setup script accepting only `--fresh`, confirming the local deployment hardening must be pushed before `--reinstall` works on the server.

## v-1.0.35

### [v 1.0.35] 2026-05-25 10:40 pm - multi tenant static domain pages

- Bumped workspace version to 1.0.35
- Added a reusable backend `DomainResolutionEngine` so domain-to-tenant lookup, tenant app access, landing app selection, and domain settings are resolved in one service path.
- Added public `GET /api/site/tenant-static` for domain-aware static pages without requiring dashboard authentication.
- Built tenant-aware public page scaffolds for billing, ecommerce, inventory, accounts, auditor office, sports club, garment manufacturing, and offset billing from the same deployed frontend codebase.
- Updated the landing frontend to switch brand, navigation, page content, and primary action from the resolved tenant/domain and fail closed when no tenant domain is mapped.
- Updated assist architecture rules to keep future tenant public pages behind the shared domain-resolution engine.
- Added the first live client scope catalog for Aaran Associates, CODEXSUN shared billing, offset printers, garment manufacturers, fabric trading, UPVC, ecommerce stores, sports club, testing lab, and business connect tenants.
- Seeded live client tenant rows, industry labels, tenant app scopes, tenant domain mappings, and tenant company names from the shared live scope catalog.
- Added Windows local host helper scripts through `npm run hosts:local` and `npm run hosts:check` for exact `*.codexsun.com` development domains.
- Shifted public tenancy to strict domain isolation: unmapped domains fail closed, while `codexsun.com` is treated as its own CODEXSUN tenant domain instead of a shared fallback.
- Added explicit `.local` development tenant domains for the current client list and allowed `.local` origins during local API testing.
- Corrected the SMS UPVC local tenant alias to `smsupvc.local`.
- Reworked tenant public home/content generation to use industry, company, requirements, and enabled-app metadata, with a tenant static content contract test for future domain/app binding changes.
- Bound public contact submissions to the resolved tenant domain, added sample transaction isolation testing, and disabled the unused platform landing fetch on strict tenant pages.
- Removed remaining localhost/domain fallback behavior from tenant setup, removed hardcoded seeded admin credentials, and made tenant dashboard app access fail closed to Application-only when tenant app metadata is missing.

## v-1.0.34

### [v 1.0.34] 2026-05-25 8:57 pm - version update

- Bumped workspace version to 1.0.34
## v-1.0.33

### [v 1.0.33] 2026-05-25 1:10 pm - tenant app access and landing desk controls

- Bumped workspace version to 1.0.33
- Added an Apps tab to the super-admin tenant show page with per-tenant app access switches and a single Publish action.
- Persisted tenant app access in tenant `payload_settings.apps.enabled` so each tenant can receive a different enabled app set, such as Billing + Task Manager + Inventory or Billing + Ecommerce.
- Added tenant dashboard handling for saved app access so disabled apps are hidden/blocked and enabled apps drive the app switcher/sidebar.
- Added an Application Landing Desk page for tenant users with radio-button landing app selection and enabled-app controls, with Billing as the default tenant landing desk.
- Added client setup progress feedback and tenant setup policy repair so tenant admin logins can reach company/default-context after setup.
- Fixed tenant update timestamps to use MariaDB-safe datetime values during super-admin tenant publishes.

## v-1.0.32

### [v 1.0.32] 2026-05-25 11:05 am - vite preview codexsun allowed hosts

- Bumped workspace version to 1.0.32
- Added Vite preview `allowedHosts` defaults for `codexsun.com` and `www.codexsun.com` so Nginx HTTPS proxy requests are accepted by the frontend preview server.
- Added `VITE_ALLOWED_HOSTS` support for future comma-separated preview host additions without code changes.
- Added a `--fresh` option to `.container/setup-cloud.sh` that cleans and reinstalls only the CXSun app container/workspace volume while preserving MariaDB.
- Verified the frontend host-header fix with frontend typecheck and production build.

## v-1.0.31

### [v 1.0.31] 2026-05-25 10:53 am - codexsun cloud setup script

- Bumped workspace version to 1.0.31
- Added a dedicated `.container/setup-cloud.sh` deploy script with `https://codexsun.com` defaults for `VITE_API_BASE_URL`, `FRONTEND_URL`, and `CORS_ORIGINS`.
- Restored `.container/setup-local.sh` to localhost defaults so local and cloud deployment paths stay separate.
- Updated the container README to document the cloud setup command and the local setup command separately.
- Verified script syntax and Docker compose cloud environment resolution for app, MariaDB, Redis, ports, and HTTPS URL settings.

## v-1.0.30

### [v 1.0.30] 2026-05-25 10:43 am - container ports mariadb redis and https cors

- Bumped workspace version to 1.0.30
- Moved all active backend defaults from port `6001` to `6005`, including local env, Docker expose/publish settings, server settings, frontend proxy fallback, and assist architecture guidance.
- Aligned Docker/cloud configuration to use the existing MariaDB service at `mariadb:3306` with `DbPass1@@`, while keeping local `.env` pointed at `localhost:3306` with the local password.
- Removed the PostgreSQL container setup from the active deployment path and documented the MariaDB/Redis split between local and Docker/cloud environments.
- Added Redis installation/startup support through `.container/database/redis.yml` and `.container/setup-local.sh`, with container env written by the entrypoint as `redis:6379`.
- Added configurable HTTPS-aware CORS support using `FRONTEND_URL` and comma-separated `CORS_ORIGINS`, while preserving localhost development origins.
- Set the cloud/container deployment defaults to `https://codexsun.com` for `VITE_API_BASE_URL`, `FRONTEND_URL`, and CORS origins.
- Added `.container/setup-cloud.sh` for codexsun cloud deploys and restored `.container/setup-local.sh` to localhost defaults.
- Verified the release with Docker compose config checks for the app and Redis plus the standard `npm run check`.

## v-1.0.29

### [v 1.0.29] 2026-05-25 10:16 am - auth session and dynamic dev port mapping

- Fixed dynamic dev port mapping so server preflight writes the selected backend port and frontend preflight/Vite proxy use that live API target instead of falling back to `localhost:6001`.
- Centralized frontend API base URL handling and removed duplicated hardcoded `6001` defaults from tenant, system update, auth, and public site calls.
- Fixed stale admin-session 403s after restart by making the admin-user seeder idempotent; seeded admin password hashes and `updated_at` no longer rotate unless the account actually changes.
- Added frontend auth invalidation handling so protected API 403 responses clear stored sessions and return the dashboard to login cleanly.
- Reworked the super-admin navigation polish: restored Tenant under the Admin group, removed the separate Tenant section/Company wiring, and moved System Update into a new Setting section.
- Verified with server/frontend typechecks, server/frontend production builds, `db:fresh`, and a seed-stability smoke test that reused the same super-admin token before and after `db:seed`.

## v-1.0.28

### [v 1.0.28] 2026-05-25 8:48 am - tenant-local auth and fresh migration stability

- Reworked authentication around tenant-local identities: master keeps tenant login identifiers and admin users, while each tenant database owns its users and user-tenant access.
- Added corporate ID/mobile login resolution with default `CODEXSUN` and `9655227738` tenant identifiers.
- Split tenant, admin, and super-admin login surfaces so each dashboard uses the correct identity source and route family.
- Simplified admin and super-admin login to email/password only, with platform roles stored directly on `admin_users`.
- Removed tenant-specific admin user mappings so first master setup can seed admin users without creating or installing a tenant database.
- Removed master `users` / `user_tenants` table ownership and removed hardcoded login fallbacks outside the admin seeder.
- Seeded the platform super-admin and software-admin identities in the admin user seeder.
- Flattened fresh migrations so module table definitions own their final columns instead of running add/drop/alter compatibility passes.
- Fixed fresh master and tenant provisioning order so `db:fresh` recreates master, seeds the default tenant, drops tenant databases, and rebuilds tenant schemas cleanly.
- Fixed tenant accounting-year seeding by including `books_start` in the module definition and seed rows.
- Updated startup preflight so direct app startup uses project-local binaries, avoids killing existing servers in non-interactive mode, and moves to the next free port.
- Removed the unused Client Manager feature, including sidebar/dashboard entries, frontend pages, backend module wiring, `/api/v1/clients` routes, and the platform `clients` table migration.
- Reworked the super-admin User Manager into Admin User Manager backed by master `admin_users`, with dedicated `/api/v1/admin-users` list/upsert APIs and admin-role/status forms.
- Verified with server typecheck, server build, master-data contract test, `db:fresh`, and preflight startup health checks.

## v-1.0.27

### [v 1.0.27] 2026-05-24 9:35 pm - master database preflight and demo tenant setup

- Added centralized server configuration holders under `framework/config` for sanitized `.env` loading, app settings, and database configuration.
- Moved server-side database, auth, URL, and runtime settings off scattered `process.env` reads and through shared `settings` / `dbConfig` access.
- Added server preflight checks for MariaDB connectivity, master database existence, and master table availability before launching dev.
- Added interactive first-run setup with custom master database name support, plus non-interactive dev bootstrap for `concurrently`.
- Changed base master seed to create `Demo-app` as the first active tenant with `demo_db` and the `localhost` primary domain.
- Updated auth seed defaults to attach demo users to `demo_app` and restricted tenant setup to active, non-deleted tenants.
- Fixed stock ledger tenant migration ordering so `stock_ledger_entry_id` exists before indexes are created.
- Verified the release with server typecheck, server build, direct preflight migration setup, and full master/tenant database setup.

## v-1.0.26

### [v 1.0.26] 2026-05-24 6:00 pm - stock ledger barcode UX and settings polish

- Refined the Stock Ledger generate step so previous generated barcodes render as one normal paginated table with 25-row default pagination, multi-select printing, icon-only row print/drop actions, and no nested scroll cards.
- Added a top status summary for purchase inward quantity, generated labels, and verified labels above the generated barcode table.
- Added drop protection and cleaner row actions so posted/confirmed serializations cannot be dropped from the generated label table.
- Improved Stock Settings with editable serial, batch, and barcode format fields, token helper text, a live preview, and a current week-number helper.
- Changed the standard serial format from `{serial4}` to `{####}` while preserving backend compatibility for existing `{serial4}` settings.
- Verified the release with frontend/server typechecks and frontend production builds during the stock ledger polish pass.

## v-1.0.25

### [v 1.0.25] 2026-05-24 4:34 pm - stock ledger barcode and serial movement foundation

- Bumped workspace version to 1.0.25
- Added a modular stock ledger backend under `modules/stock/ledger` with domain entities, events, queue-backed event bus, service, repository, HTTP controller, tenant migrations, and app/provisioning wiring.
- Added tenant stock tables for stock settings, immutable ledger movements, live balances, purchase receipt serializations, and generated serialization item barcodes.
- Added APIs for stock settings, purchase receipt intake details, serial/batch/barcode generation, scan verification, posting verified serials into live stock, live balance listing, and barcode availability checks.
- Added the Inventory Stock Ledger frontend page with purchase receipt selection, product quantity/pending intake view, partial/full/single serial generation, scan verification, barcode label print action, post-to-live-stock confirmation, and live stock balance list.
- Verified the stock ledger foundation with `npm -w apps/server run typecheck`, `npm -w apps/frontend run typecheck`, and `npm -w apps/frontend run build`.
## v-1.0.24

### [v 1.0.24] 2026-05-24 3:48 pm - voucher work order and product autocomplete cleanup

- Bumped workspace version to 1.0.24
- Fixed purchase receipt save compatibility for legacy tenant columns and migrated the `aaran` tenant database.
- Cleaned purchase receipt and delivery note show/print layouts by removing IRN/Ack/account/supplier bill clutter, aligning document/work-order fields, and changing Terms to Notes with custom terms support.
- Added Inventory Master/Common side-menu access for contacts, products, work orders, product common data, and common operational records.
- Renamed the visible Order master concept to Work Order across voucher forms, menus, print labels, search placeholders, and master metadata while keeping the existing `orders` API key.
- Added a shared Work Order autocomplete with body-portaled create popup and Code/Name/Description entry, then wired it into sales, purchase, receipt, payment, purchase receipt, and delivery note.
- Added a shared Product autocomplete with a full product create popup and inline common-module creation for HSN Code, Unit, and GST %, then wired it into sales, purchase, purchase receipt, and delivery note.
- Verified the release batch with `npm -w apps/frontend run typecheck`, `npm -w apps/server run typecheck`, and `npm -w apps/frontend run build`.

## v-1.0.23

### [v 1.0.23] 2026-05-24 2:38 pm - stock purchase receipt and delivery note material flow

- Added Stock module purchase receipt and delivery note flows with list, show, upsert, print, frontend routing, side-menu wiring, document settings, and tenant backend API modules.
- Moved Stock menu items to focus on Purchase Receipts, Stock Ledger, and Delivery Note, with Purchase Receipts first.
- Added Inventory document settings for purchase receipt serial numbering.
- Aligned stock contact selection so purchase receipts use supplier/vendor customer contacts and delivery notes use customer/vendor customer contacts.
- Trimmed stock documents into material movement screens by removing finance totals, tax columns, place of supply, due date, e-way/e-invoice generation, transport, vehicle, e-way part, and visible status controls.
- Kept item pricing while displaying material-focused quantity and rate rows, with a right-aligned Total Qty footer below purchase receipt and delivery note item tables.
- Verified the stock frontend changes with `npm -w apps/frontend run typecheck` and `npm -w apps/frontend run build`.

### [v 1.0.22] 2026-05-23 10:39 pm - media manager and picker integration

- Bumped workspace version to 1.0.22
- Added a standalone Media application with tenant media upload, browse, delete, share, link, public/private storage, activity tracking, and media dashboard routing.
- Wired tenant media persistence through a modular backend media module, tenant migrations, public/private storage folders, queue events, and larger upload body limits.
- Added a reusable media picker dialog for application-wide file selection and upload without exposing a duplicate Browser page in the side menu.
- Connected the first media picker integration to Company logo selection so company logo variants can upload or choose public media from a popup.
- Added frontend public storage access through `apps/frontend/public/storage` pointing to root `storage/public`.
- Corrected media storage resolution so uploads are written to root `storage/public` even when the server runs from `apps/server`, and removed the stale server-local storage folder after copying existing media.
- Verified the media manager and picker changes with `npm -w apps/server run typecheck` and `npm -w apps/frontend run typecheck`.

## v-1.0.21

### [v 1.0.21] 2026-05-23 5:28 pm - billing receipt, payment, purchase, and statement reports

- Added standalone purchase, receipt, and payment entry flows with list, show, upsert, print, comments, activity, and entry tools aligned to the sales module tone.
- Added receipt and payment voucher print layouts with A5 landscape print handling, hidden app chrome/toasts, signature blocks, company names, and Tiruppur jurisdiction footer.
- Added customer and supplier statement report pages under the Billing report menu.
- Built customer statements from sales customers only, combining opening balance, sales, and receipts after a party is selected.
- Built supplier statements from purchase suppliers only, combining opening balance, purchase, and payments after a party is selected.
- Defaulted statement date filters to the active accounting year start through today, with current financial-year fallback.
- Matched statement print output to the sales print header style, removed the separate statement title row, added equal bordered party/ledger panels, party GSTIN/address output, removed the redundant party table column, and moved page number to the printed page bottom-right.
- Verified the latest frontend statement/report changes with `npm -w apps/frontend run typecheck`.

### [v 1.0.20] 2026-05-23 - GST statement report from temp

- Added the Billing GST Report route from the temp report pattern.
- Built sales and purchase GST side tables with date, voucher, party, taxable value, GST, and total columns.
- Added GST balance, tax split, and period comparison summary sections.
- Connected opening GST to company software settings and wired month/date filters from common month records.
- Added print-ready A4 GST report output with company letterhead and routed `app-billing-gst-report` in the tenant dashboard.
- Verified the GST report changes with `npm -w apps/frontend run typecheck`.

### [v 1.0.20] 2026-05-23 8:01 am - sales voucher compliance preparation

- Prepared the current uncommitted sales batch for GST/e-way/e-invoice compliance work.
- Reserved this batch for sales voucher persistence, print/show layout, round-off handling, and industry-specific PO/DC/colour/size toggles.
- Kept the pending work in the existing dirty tree so the next edits can continue from the current sales implementation.

## v-1.0.19

### [v 1.0.19] 2026-05-22 5:35 pm - tenant settings and sales voucher refinement

- Wired settings and sales settings into standalone tenant routes, including document number settings with automatic invoice numbering, optional prefix/separator/suffix switches, manual invoice overrides, and compact responsive cards.
- Added tenant default company context backed only by database records, with editable company/accounting-year lookup selection and primary-company synchronization.
- Reworked accounting year data so seeded years start on 1 Apr and end on 31 Mar, beginning from FY 2017-18, with current-year tagging and date-safe tenant reads.
- Cleaned product master list, show, and upsert screens by removing unused group/category/type/brand/colour/size/style surfaces, hiding UUIDs, showing lookup names, adding filters/columns controls, and tightening detail spacing.
- Standardized active-status controls across product, contact, common, and company forms by removing helper taglines and matching the compact company style.
- Added standalone module routing rules and feature-owned product/contact/common behavior instead of growing generic master-data pages with module-specific branching.
- Added default-company navigation under the application menu and kept Accounting Year under Settings instead of the Others group.
- Enhanced sales customer selection with customer-name-only autocomplete display, an animated inline contact-create popup, duplicate GSTIN validation, address lookups for country/state/district/city/pincode, and front-layer dropdown behavior inside modals.
- Updated sales order and product autocomplete display to clean name/code values, and reshaped sales line entry by replacing HSN/unit fields with colour, size, PO, DC, and textarea description fields.
- Added persisted sales item fields for colour, size, PO number, and DC number, plus tenant migration support and matching sales print/preview output.
- Added reusable pincode autocomplete lookup support and reused common inline-create lookups for sales address and item metadata.
- Added `db:refresh` tenant convenience wiring for the `aaran` tenant and ran targeted frontend/server typechecks plus the Aaran tenant migration during implementation.

### [v 1.0.18] 2026-05-16 5:52 pm - flattened common seeders and default records

- Flattened standalone common module internals into direct module files for faster module-level maintenance.
- Added `seeder.ts` to every common module and wired all 28 common seeders into tenant database startup.
- Seeded a default hyphen record for every common module so optional or unknown references have a safe default value.
- Added default hyphen seed records for contact, product, and order master modules.
- Kept country seeds focused with India first, the hyphen fallback second, and a short important-country list.
- Reordered country and state common definitions so list columns show name before code and reference fields.
- Extended master-data contract checks to require common module seeders and standalone master seeders.

### [v 1.0.18] 2026-05-16 - migration manager and tenant public ids

- Added a core migration manager with CLI scripts for `db:migrate`, `db:seed`, `db:setup`, and `db:fresh`.
- Added tenant database fresh/setup verification for Aaran and a clear failure path when requesting retired or missing tenants such as `sundar`.
- Added `uuid CHAR(8) NOT NULL UNIQUE` public IDs across tenant tables while keeping integer `id` as the internal primary key.
- Backfilled and enforced tenant UUID columns through provisioning, and updated company and sales insert paths to generate short public IDs.
- Added rulebook guidance that tables use `id INT AUTO_INCREMENT PRIMARY KEY` internally and an 8-character public `uuid`, with a future 16-character migration path.

### [v 1.0.18] 2026-05-16 - default tenant and user seed refresh

- Refreshed platform seed users to one super-admin identity, one software admin identity, and Aaran tenant users.
- Rewrote default tenant seeds around Aaran, Sathasivam, Sampath, and Sathish.
- Moved local development domains to the Aaran tenant.
- Seeded Aaran tenant companies as Aaran Associates, Aaran Info Tech, Tirupur Direct, and Tenkasi Sports.
- Replaced tenant-local role seeds with admin, manager, staff, and user while hiding super-admin from user assignment.

### [v 1.0.18] 2026-05-16 10:30 am - upgraded backend structure boundaries

- Reorganized backend folders so platform/framework modules live under `apps/server/src/core`:
  - `tenant`
  - `tenant-domain`
  - `industry`
  - `health`
  - `system/system-update`
- Renamed top-level backend shared helpers from `apps/server/src/common` to `apps/server/src/shared` to avoid confusion with business common modules.
- Moved reusable master-data compatibility API under `apps/server/src/modules/foundation/master-data` beside the `foundation/master-record` engine.
- Moved Client Manager into `apps/server/src/modules/crm/client`.
- Moved Company into `apps/server/src/modules/master/company`.
- Kept business common modules under `apps/server/src/modules/common/<group>/<module>`.
- Kept standalone tenant entries under `apps/server/src/modules/entries`, including `entries/sales`.
- Updated application module imports, platform database module imports, and server scripts for the new structure.
- Fixed class-level `@UseGuards(...)` metadata so class-protected controllers are enforced correctly by the bootstrap.
- Rechecked stale moved paths and verified server/frontend typecheck and builds.

### [v 1.0.18] 2026-05-15 10:57 pm - standalone common modules and foundation structure

- Bumped workspace version to 1.0.18
- Added `modules/foundation/master-record` for shared master-record contracts, events, aggregate, repository, input normalization, event bus, and migration helpers
- Converted all common records into standalone `common/<group>/<module>` backend modules with domain, application, infrastructure, interface, database, and module registration files
- Added standalone common HTTP endpoints under `/api/v1/common/<moduleKey>` while preserving the existing `master-data` compatibility API for current frontend screens
- Wired standalone common modules into the app module and tenant database provisioning path
- Added contract checks so each common module must keep its module, service, repository, controller, migration, and grouped definition files
- Kept contact, product, and order as standalone master modules under `modules/master`

## v-1.0.17

### [v 1.0.17] 2026-05-15 7:25 pm - user manager mapped controls and company show tables

- Bumped workspace version to 1.0.17
- Moved mapped tenant users into a full-width second-row list under the tenant profile
- Added search, status filters, column visibility controls, pagination, and 3-dot row actions to the mapped users list
- Wired mapped user Edit, Suspend, and Restore actions through the real platform user upsert API
- Kept mapped users tenant-scoped through `user_tenants` while showing tenant mapping context in the list
- Updated the Company show page to the same compact grouped key/data table tone as tenant show pages

## v-1.0.16

### [v 1.0.16] 2026-05-15 5:34 pm - master user manager

- Bumped workspace version to 1.0.16
- Added real super-admin User Manager backed by platform `users`, `user_tenants`, and `tenants` tables
- Added user tenant summary, tenant user detail, and platform user upsert API endpoints under `/api/v1/users`
- Wired User Manager list, show, and individual upsert pages into the super-admin Admin group
- Matched Tenant, Domain, Industry, and Client Manager show pages to the same compact key/data table format
- Kept master-table user identity separate from tenant access assignment while preserving dashboard surface boundaries

## v-1.0.15

### [v 1.0.15] 2026-05-15 10:34 am - dashboard surface split and tenant domain management

- Bumped workspace version to 1.0.15
- Split frontend dashboard surfaces into tenant, admin, and super-admin route families with separate login gates and session storage
- Added tenant-domain list, show, upsert, suspend, and restore flows under the super-admin surface
- Added tenant-domain backend list/upsert support and registered platform database modules for tenant, domain, industry, auth, client, queue, and site data
- Refactored super-admin navigation into Admin and Tenant groups, keeping Company in the tenant-database lane
- Standardized master-list row actions, rounded 3-dot menus, and form tone across domain, industry, company, and client manager
- Documented the product picture, tenant resolution flow, dashboard boundaries, and current architecture in assist context

## v-1.0.14

### [v 1.0.14] 2026-05-15 7:15 am - app company routing and tenant load stability

- Bumped workspace version to 1.0.14
- Synced package versions, display metadata, and changelog state to one release version
- Wired app navigation to `/app` routes with TanStack Query backed frontend communication
- Verified tenant/company API isolation with heavy multi-tenant transaction testing

## v-1.0.12

### [v 1.0.12] 2026-05-14 5:20 pm - Fixed System Update preflight

- Bumped workspace version to 1.0.12
- Fixed System Update preflight so local version, GitHub version, branch, upstream, and commits are always shown when available
- Removed the tracked rollback warning banner from the System Update dashboard page

## v-1.0.11

### [v 1.0.11] 2026-05-14 5:10 pm - cli version bump

- Bumped workspace version to 1.0.11
- Added `npm run version:bump` to create the next version across packages and changelog state
- Added a `github:now` prompt to bump the next version before commit

## v-1.0.10

### [v 1.0.10] 2026-05-14 3:58 pm - version update and system update module

- Added changelog parsing for versioned entries with timestamped headers
- Refactored GitHub helper commit subjects to use `#<ref> - <title>`
- Preserved changelog version labels while keeping Git commit messages concise
- Added an interactive GitHub helper review prompt before pull, commit, and push

### [v 1.0.10] 2026-05-14 4:19 pm - system update module

- Added a backend system update API that force-resets local changes, pulls Git updates, installs dependencies, builds active apps, and checks frontend/backend health
- Added a dashboard System Update page with update trigger, status cards, step logs, and health results
- Wired System Update into the dashboard sidebar menu
- Added preflight latest-version checks for local Git/package version versus cloud Git/package version
- Preserved `.env`, `storage/`, and `build/` by removing untracked cleanup from the update flow
- Added a restart hook through `CXSUN_RESTART_COMMAND`

### [v 1.0.10] 2026-05-14 3:44 pm - Docker deployment refinements

- Redirected backend build output to `build/server`
- Redirected frontend build output to `build/frontend`
- Updated package/app TypeScript outputs to root `build/`
- Added `.container/Dockerfile`, `.container/entrypoint.sh`, `.container/README.md`, `.dockerignore`, and `.container/docker-compose.yml`
- Updated the container entrypoint to create `.env` from `.env.sample` and write configured backend/frontend ports before building
- Added a clone/install/build/run container entrypoint using `https://github.com/CODEXSUN/cxsun.git` by default
- Connected the app container to the existing `codexion-network` and existing Postgres/Redis service hostnames
- Renamed the app workspace Docker volume to `cxsun-volume`
- Made local setup remove/recreate the app container and workspace volume before redeploy

### [v 1.0.10] 2026-05-14 3:44 pm - Backend root welcome page

- Added a server root HTML page at `/` showing backend status, timestamp, and frontend link
- Added an automatic redirect from the backend root page to the configured frontend URL

### [v 1.0.10] 2026-05-14 3:49 pm - Changelog stability repair

- Restored historical changelog entry labels so old entries do not all become the current version
- Updated release tooling so future version bumps do not rewrite historical changelog entries

## v-1.0.09

### [v 1.0.09] 2026-05-14 1:50 pm - frontend shell and sync tooling

### [v 1.0.09] 2026-05-14 1:50 pm - align assist guidance to active app layout

- Updated assist architecture guidance to use `apps/server` and `apps/frontend` as active implementation targets
- Documented placeholder status for `packages/web` and `packages/mobile`
- Updated AI coding rules, default agent guidance, PR template, and assist check script for the current workspace pattern
- Added architecture context decision records for the active app structure

### [v 1.0.09] 2026-05-14 1:50 pm - make assist verification self-contained

- Added workspace map, verification rules, and server module template for future AI-assisted work
- Added root `check`, `typecheck:active`, and `build:active` scripts
- Added minimal reserved package entrypoints so web and mobile placeholders typecheck cleanly
- Updated assist check and PR guidance to include all typecheckable workspaces

### [v 1.0.09] 2026-05-14 1:50 pm - replace starter frontend and root readme

- Replaced the Vite starter screen with a CXSun operations dashboard shell
- Added tenant, module, workflow, and backend health surfaces to the frontend
- Updated the root README to document the real monorepo layout and commands
- Fixed constructor injection metadata lookup so the health endpoint resolves its service correctly

### [v 1.0.09] 2026-05-14 1:50 pm - add landing site, Tailwind, shadcn UI, and SQLite API

- Moved frontend CSS into `apps/frontend/src/assets/css`
- Added Tailwind CSS, shadcn-style UI primitives, lucide icons, and a theme switch
- Reworked the frontend into a landing page with top navigation, footer, about, services, contact, and blog surfaces
- Added Kysely with SQLite at `storage/database/cxsun.sqlite`
- Added backend site content and contact endpoints consumed by the frontend

### [v 1.0.09] 2026-05-14 1:50 pm - wire official shadcn login and dashboard blocks

- Added the `shadcn` CLI package to the frontend workspace
- Installed and wired the official `login-01` block
- Attempted `dashboard-07`, but the current official registry does not expose that item; wired the available official `dashboard-01` block instead
- Added generated shadcn sidebar, chart, table, form, and navigation primitives to the frontend
- Added frontend path aliases required by generated shadcn imports

### [v 1.0.09] 2026-05-14 1:50 pm - force frontend dev host binding

- Updated Vite config and frontend preflight launch to bind dev/preview to `0.0.0.0`
- Verified the frontend responds on `127.0.0.1:6000`

### [v 1.0.09] 2026-05-14 1:50 pm - move frontend away from unsafe browser port

- Changed the frontend dev port from `6000` to `6010` because Chromium blocks `6000` with `ERR_UNSAFE_PORT`
- Updated Vite defaults, preflight defaults, `.env.sample`, local `.env`, and docs

### [v 1.0.09] 2026-05-14 1:50 pm - normalize frontend API base URL

- Updated `VITE_API_BASE_URL` to point at the backend origin instead of `/api`
- Added frontend API base normalization so both origin and `/api` suffixed values resolve correctly

### [v 1.0.09] 2026-05-14 1:50 pm - wire shadcn sidebar-07 to dashboard

- Added official `sidebar-07` block through the shadcn CLI
- Kept the existing app surfaces unchanged and wired the generated sidebar through the existing dashboard sidebar import

### [v 1.0.09] 2026-05-14 1:50 pm - initialize shadcn b0 Vite monorepo preset

- Ran `npx shadcn@latest init --preset b0 --template vite --monorepo --pointer`
- Added `apps/web` and `packages/ui` compatibility workspaces expected by the shadcn monorepo preset
- Updated shadcn config to `radix-nova` with neutral base styling
- Added preset-required CSS imports and dependencies
- Included the new compatibility workspaces in the standard typecheck flow

## v-1.0.08

### [v 1.0.08] 2026-05-14 8:57 am - port 6000 frontend 6001 backend with preflight port check

- Added preflight port check scripts (`preflight.mjs`, `preflight-port.mjs`) to verify port availability before starting dev servers
- Configured frontend dev server on port 6000
- Configured backend server on port 6001
- Updated Vite config for dev server proxy and port
- Updated `.env.sample` with port configuration

## v-1.0.07

### [v 1.0.07] 2026-05-14 8:49 am - add graceful shutdown and error resilience to server

- Added graceful shutdown handlers for SIGTERM and SIGINT signals
- Implemented proper cleanup on server close
- Added error resilience middleware for uncaught exceptions and unhandled rejections
- Improved server startup with port conflict detection

## v-1.0.06

### [v 1.0.06] 2026-05-14 8:47 am - add fastify server with health route and concurrently dev

- Added Fastify as the server framework with TypeScript support
- Implemented health check route (`GET /health`)
- Added `concurrently` for parallel dev script running server and frontend
- Updated `package.json` with `dev`, `dev:server`, `dev:frontend` scripts
- Updated frontend Vite config for proxy to backend

## v-1.0.05

### [v 1.0.05] 2026-05-14 8:42 am - fix frontend duplicate workspace conflict

- Removed duplicate server package from `packages/server/` that conflicted with `apps/server/`
- Resolved workspace naming collision between `packages/server` and `apps/server`
- Consolidated all server code into `apps/server/` only

## v-1.0.04

No changelog entry was recorded for this version.

## v-1.0.03

### [v 1.0.03] 2026-05-14 8:41 am - removed version from commit message

- Removed version number from commit message template
- Updated changelog format to match new convention
- Refactored commit template to `#<ref> <description>` format

## v-1.0.02

### [v 1.0.02] 2026-05-14 8:39 am - normalized all version refs

- Standardized version reference format across workspace package files
- Updated README, changelog, templates, and `index.html` for version consistency
- Synced version strings across root workspace and sub-packages

## v-1.0.01

### [v 1.0.01] 2026-05-14 8:32 am - updated log

- Refactored commit message format
- Updated commit template to `#<ref> v<version> <description> as #<ref> - <title>`

## v-1.0.00

### [v 1.0.00] 2026-05-14 8:29 am - init new application

- Added `assist/` directory with AI agent rules, templates, scripts, context, and agent configs
- Added `CHANGELOG.md` for versioned action tracking
- Added version display to the application UI
- Updated `index.html` with version meta tag
- Updated commit template to use `#<number> <message>` format
