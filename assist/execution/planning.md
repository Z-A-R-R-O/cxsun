# Session Plan

**Date:** 2026-05-14
**Version:** 1.0.08

## Objective

Add multi-theme support to the active Vite frontend, including blue, emerald, orange, and indigo theme presets plus light/dark/system mode handling.

## Phases

### Phase 1: Session orientation

- Read `assist/README.md`.
- Load relevant rules from `assist/rules/`.
- Load project context from `assist/context/`.
- Record the current user prompt for review.

### Phase 2: Ready state

- Inspect the real workspace structure.
- Update stale assist guidance.
- Verify assist files reference the current active apps and checks.
- Await the next implementation task.

### Phase 3: Frontend theme work

- Inspect current frontend theme wiring and shadcn configuration.
- Add a Vite theme provider using project storage keys.
- Add theme color variants for blue, emerald, orange, and indigo.
- Replace the existing binary theme switch with mode and color selection.
- Run frontend typecheck/build verification.

### Phase 4: Frontend startup performance

- Reproduce the frontend production build output.
- Remove the landing-page first-paint data loading gate.
- Ensure frontend builds use React production runtime even with local development env defaults.
- Verify local startup, browser console, and first paint timing.

### Phase 5: Tenant runtime architecture scan

- Trace URL/domain to tenant to tenant database runtime flow.
- Scan tenant-domain, tenant, industry, company, and auth API surfaces.
- Fix narrow blockers in tenant context resolution and protected tenant access.
- Update README and assist architecture guidance with the current persistence split.

### Phase 6: Dashboard role split

- Split dashboard modes into super-admin, admin, and tenant surfaces.
- Keep super-admin as platform orchestration.
- Keep admin focused on software operations, bugs, helpdesk, client notes, and updates.
- Keep tenant dashboard isolated to tenant database companies and roles.
- Verify typecheck/build/check without warnings.

### Phase 7: Dedicated dashboard URL families

- Split frontend route families into `/app`, `/admin`, and `/sa`.
- Add separate login routes and auth storage per surface.
- Keep `/app/company`, `/admin/company`, and `/sa/company` behavior distinct.
- Verify route guards, typecheck, build, and full check.

### Phase 8: Product picture

- Add a clear assist product picture for the software direction.
- Describe public site, tenant workspace, admin desk, and super-admin orchestration.
- Describe module roadmap and route/data boundaries.

### Phase 9: Super-admin domain management

- Add tenant domain master list, show page, and upsert page using the common list pattern.
- Add tenant-domain list/upsert API endpoints.
- Wire domain management into the super-admin sidebar and `/sa/tenant-domain` route.
- Verify frontend/server/full checks without warnings.
