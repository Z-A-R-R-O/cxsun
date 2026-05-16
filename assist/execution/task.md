# Tasks

## Phase 1: Session orientation

- [x] `1.1` Read `assist/README.md`
- [x] `1.2` Load `assist/rules/`
- [x] `1.3` Load `assist/context/`
- [x] `1.4` Record current user prompt

## Phase 2: Ready state

- [x] `2.1` Summarize active guidance
- [x] `2.2` Inspect application structure against assist guidance
- [x] `2.3` Run workspace typecheck smoke checks
- [x] `2.4` Update assist architecture docs
- [x] `2.5` Update assist coding/core rules
- [x] `2.6` Update assist check script and PR template
- [x] `2.7` Verify finalized assist guidance
- [x] `2.8` Add workspace map, verification rules, and server module template
- [x] `2.9` Make reserved web and mobile packages typecheckable
- [x] `2.10` Run final verification
- [x] `2.11` Replace Vite starter frontend with CXSun app shell
- [x] `2.12` Update root README for current repo
- [x] `2.13` Fix health endpoint dependency injection
- [x] `2.14` Run final verification
- [x] `2.15` Move frontend CSS under assets/css
- [x] `2.16` Add Tailwind and shadcn-style UI foundation
- [x] `2.17` Add landing pages with theme switch
- [x] `2.18` Add Kysely SQLite storage and site API
- [x] `2.19` Verify frontend/backend/database communication
- [x] `2.20` Add shadcn CLI package
- [x] `2.21` Install and wire shadcn login block
- [x] `2.22` Attempt dashboard-07 and wire available dashboard block
- [x] `2.23` Verify generated blocks compile and preview
- [x] `2.24` Fix frontend host binding for browser access
- [x] `2.25` Move frontend from unsafe browser port 6000 to 6010
- [x] `2.26` Add and wire shadcn sidebar-07 to dashboard
- [x] `2.27` Initialize shadcn b0 Vite monorepo preset
- [x] `2.28` Add preset compatibility workspaces
- [x] `2.29` Verify preset dashboard smoke and full check
- [x] `2.30` Redirect build outputs to root build folder
- [x] `2.31` Add Docker deploy environment
- [x] `2.32` Verify root build and container files
- [ ] `2.33` Await next implementation task

## Phase 3: Frontend theme work

- [x] `3.1` Read current prompt into prompt review
- [x] `3.2` Inspect frontend theme and shadcn setup
- [x] `3.3` Add theme provider and theme preset tokens
- [x] `3.4` Wire mode and color theme controls
- [x] `3.5` Run frontend verification

## Phase 4: Frontend startup performance

- [x] `4.1` Record current prompt into prompt review
- [x] `4.2` Reproduce frontend build output
- [x] `4.3` Fix production build environment handling
- [x] `4.4` Remove landing-page first-paint blocker
- [x] `4.5` Verify build, local startup, browser console, and first paint timing

## Phase 5: Tenant runtime architecture scan

- [x] `5.1` Record current prompt into prompt review
- [x] `5.2` Trace URL/domain to tenant to tenant database flow
- [x] `5.3` Scan tenant-domain, tenant, industry, company, and auth surfaces
- [x] `5.4` Fix tenant context fallback and protected tenant access blocker
- [x] `5.5` Update README and assist architecture docs

## Phase 6: Dashboard role split

- [x] `6.1` Record current prompt into prompt review
- [x] `6.2` Split dashboard route modes by super-admin, admin, and tenant
- [x] `6.3` Split sidebar navigation by dashboard mode
- [x] `6.4` Add admin support and tenant roles placeholder surfaces
- [x] `6.5` Seed a development software admin role
- [x] `6.6` Verify frontend/server/full checks

## Phase 7: Dedicated dashboard URL families

- [x] `7.1` Record current prompt into prompt review
- [x] `7.2` Add `/app`, `/admin`, and `/sa` route families
- [x] `7.3` Add `/login`, `/admin/login`, and `/sg/login` auth gates
- [x] `7.4` Split auth session storage by dashboard surface
- [x] `7.5` Map `/app/company`, `/admin/company`, and `/sa/company` to distinct surfaces
- [x] `7.6` Verify clean checks

## Phase 8: Product picture

- [x] `8.1` Record current prompt into prompt review
- [x] `8.2` Create clear product picture in assist context
- [x] `8.3` Link product picture from assist README and architecture context

## Phase 9: Super-admin domain management

- [x] `9.1` Record current prompt into prompt review
- [x] `9.2` Add tenant-domain list and upsert API
- [x] `9.3` Add domain master list, show page, and upsert page
- [x] `9.4` Wire domain page to super-admin sidebar and route
- [x] `9.5` Verify clean checks

## Phase 10: Tenant common and master modules

- [x] `10.1` Record current prompt into prompt review
- [x] `10.2` Read assist rules/context and temp common/master source
- [x] `10.3` Record corrected modular/DDD/event/queue requirement
- [x] `10.4` Add individual common/master backend module folders, migrations, persistence, events, and queue hooks
- [x] `10.5` Add common popup list frontend
- [x] `10.6` Add master list/show/upsert frontend
- [x] `10.7` Wire common/master dashboard routes
- [x] `10.8` Run targeted verification

## Phase 11: Master-data contract hardening

- [x] `11.1` Record next prompt
- [x] `11.2` Add master-data contract verification script
- [x] `11.3` Run targeted contract, typecheck, and build checks

## Phase 12: Standalone master module split

- [x] `12.1` Record split prompt
- [x] `12.2` Split contacts backend module
- [x] `12.3` Split products backend module
- [x] `12.4` Split orders backend module
- [x] `12.5` Wire tenant provisioning and app module imports
- [x] `12.6` Route frontend master pages to standalone APIs
- [x] `12.7` Run verification

## Phase 13: Master folder organization

- [x] `13.1` Record master folder prompt
- [x] `13.2` Move contact/product/order modules under master folder
- [x] `13.3` Update imports, provisioning, and contract test
- [x] `13.4` Run verification

## Phase 14: Common folder organization

- [x] `14.1` Record common folder prompt
- [x] `14.2` Move common definitions under grouped common module folders
- [x] `14.3` Wire master-data registry to grouped common modules
- [x] `14.4` Add contract coverage for common folder pattern
- [x] `14.5` Run verification

## Phase 15: Standalone common modules and foundation split

- [x] `15.1` Record standalone/foundation prompt
- [x] `15.2` Move shared master-record primitives into foundation structure
- [x] `15.3` Generate standalone common module services, repositories, controllers, migrations, and module classes
- [x] `15.4` Wire app imports and tenant provisioning to standalone common modules
- [x] `15.5` Update contract coverage for standalone common module files
- [x] `15.6` Run verification

## Phase 16: Frontend standalone common API routing

- [x] `16.1` Record frontend standalone API prompt
- [x] `16.2` Route common frontend mutations and lists to standalone common APIs
- [x] `16.3` Keep master-data as registry only for common modules
- [x] `16.4` Run verification

## Phase 17: Tenant sales entries

- [x] `17.1` Record sales entry prompt
- [x] `17.2` Add standalone tenant sales backend module
- [x] `17.3` Wire sales migrations and app module
- [x] `17.4` Add sales frontend list, print preview show, comments, tools, activity, and upsert
- [x] `17.5` Run verification
- [x] `17.6` Align sales upsert UX with temp animated tab voucher pattern
- [x] `17.7` Wire master autocomplete lookups to sales contact and item draft inputs
- [x] `17.8` Replace sales item editor with temp-style add/update draft and preview table

## Phase 18: Standalone contact master

- [x] `18.1` Record standalone contact prompt
- [x] `18.2` Read temp contact migration, domain, API, and animated-tab frontend structure
- [x] `18.3` Replace contact backend persistence with standalone contact and child tables
- [x] `18.4` Add standalone contact frontend list, show, and animated-tab upsert
- [x] `18.5` Route contact dashboard pages away from generic master-data UI
- [x] `18.6` Keep sales contact lookup compatible with standalone contact records
- [x] `18.7` Run frontend and backend verification

## Phase 19: Backend structure upgrade

- [x] `19.1` Move tenant, tenant-domain, industry, health, and system update into `core`
- [x] `19.2` Move backend shared helpers from `src/common` to `src/shared`
- [x] `19.3` Move master-data into `modules/foundation/master-data`
- [x] `19.4` Move client manager into `modules/crm/client`
- [x] `19.5` Move company into `modules/master/company`
- [x] `19.6` Wire imports, platform database modules, package scripts, and app module boundaries
- [x] `19.7` Fix class-level `@UseGuards` metadata handling
- [x] `19.8` Recheck server/frontend typecheck and builds
- [x] `19.9` Update assist changelog, architecture context, rules, and templates for the upgraded structure
