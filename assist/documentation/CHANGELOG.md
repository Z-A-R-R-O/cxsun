# Changelog

## Version State

- **Current version:** `1.0.29`
- **Release tag:** `v-1.0.29`
- **Changelog label:** `v 1.0.29`

Historical changelog entries are immutable. A version bump may update this `Version State` block and add a new entry, but it must not rewrite old entry labels.

---

## v-1.0.29

### [v 1.0.29] 2026-05-25 10:16 am - auth session and dynamic dev port mapping

- Bumped workspace version to 1.0.29
- Fixed dynamic dev port mapping so server preflight writes the selected backend port and frontend preflight/Vite proxy use that live API target instead of falling back to `localhost:6001`.
- Centralized frontend API base URL handling and removed duplicated hardcoded `6001` defaults from tenant, system update, auth, and public site calls.
- Fixed stale admin-session 403s after restart by making the admin-user seeder idempotent; seeded admin password hashes and `updated_at` no longer rotate unless the account actually changes.
- Added frontend auth invalidation handling so protected API 403 responses clear stored sessions and return the dashboard to login cleanly.
- Reworked the super-admin navigation polish: restored Tenant under the Admin group, removed the separate Tenant section/Company wiring, and moved System Update into a new Setting section.
- Verified with server/frontend typechecks, server/frontend production builds, `db:fresh`, and a seed-stability smoke test that reused the same super-admin token before and after `db:seed`.

## v-1.0.28

### [v 1.0.28] 2026-05-25 8:48 am - tenant-local auth and fresh migration stability

- Bumped workspace version to 1.0.28
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

- Bumped workspace version to 1.0.27
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

- Bumped workspace version to 1.0.26
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
