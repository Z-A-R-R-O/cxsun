# Gap Analysis — Updated 2026-05-16

## Phase 1 — Immediate (Auth & Boundary Enforcement)

### 1. ✅ RESOLVED: platform-admin APIs now have AuthGuard protection

`AuthGuard` created at `core/guards/auth.guard.ts` and applied via `@UseGuards(AuthGuard)`:

| Controller | Guard placement | Still public? |
|---|---|---|
| `tenants-v1.controller.ts` | Handler-level on all methods except `context` | `GET /context` remains public |
| `tenant-domains-v1.controller.ts` | Class-level | No |
| `users-v1.controller.ts` | Class-level | No |
| `industries-v1.controller.ts` | Class-level | No |
| `health.controller.ts` | None | Yes (intentional) |
| `auth-v1.controller.ts` | None | Yes (login must be open) |

Remaining unprotected: `clients-v1.controller.ts`, `system-update.controller.ts` (need module registration and guard addition).

**Guard registered** in `AppModule` via `guards: [AuthGuard]` so DI resolution works. Bootstrap instantiates it via `container.get(AuthGuard)` and calls `canActivate()`.

**Note:** Guard always returns 403 (via bootstrap), never 401. Error code refinement deferred.

### 2. High: tenant discovery/context is anonymously enumerable

`GET /api/v1/tenants/context` is public (`tenants-v1.controller.ts`) and returns:
- tenant id/code/slug/name/status
- tenant DB host/port/name
- enabled policies
- company list for that tenant

See `resolve-tenant-context.use-case.ts`, especially the database block at lines 88-95. In a multi-tenant app this leaks internal topology before auth.

**Fix:** Remove anonymous access to `GET /api/v1/tenants/context`, or strip it down to a minimal public bootstrap payload.

### 3. High: documented tenant boundary is not enforced at runtime

Documented flow: `host/domain -> tenant_domains -> tenants -> JWT/user_tenants -> tenant database`.

**Breaks:**
- Login on a tenant domain falls back to the user's first tenant if the domain tenant is not in their access list (`auth.service.ts`).
- Runtime tenant resolution prefers caller-supplied `x-tenant-code` over both host and JWT `tenantCode` (`tenant-context.service.ts:57`).

A multi-tenant user can authenticate on one branded host and operate against another tenant by header override, as long as `user_tenants` contains access. May be acceptable for an internal super-admin tool, but contradicts the stated isolation model for tenant-facing domains.

**Fix:** Bind tenant resolution to the authenticated session and host. `x-tenant-code` should not override host for tenant-facing routes unless the caller is a super-admin in an explicit admin surface.

### 4. High: missing isolation tests

**Fix:** Add tests for cross-host login and cross-tenant header override — these are the current isolation breaks.

---

## Phase 2 - Security Hardening

### 5. ✅ RESOLVED: JWT secret fallback removed

`infrastructure/auth/jwt.ts:12` — Fallback `?? 'cxsun-local-dev-secret'` removed. Now uses `createHmac('sha256', getJwtSecret())` which throws `'JWT_SECRET environment variable is required'` at sign/verify time if unset.

### 6. ✅ RESOLVED: seed users use explicit development defaults

`modules/auth/infrastructure/auth.database.ts` now seeds one super-admin identity (`sundar@sundar.com`) and the default platform/tenant users requested for development. The old shared `SEED_USER_PASSWORD` fallback was removed.

### 7. ✅ RESOLVED: hardcoded DB password fallback removed

`tenant-database.connection.ts` — Final `?? 'Computer.1'` removed. Tenant database passwords now resolve from `process.env[secretRef]` and fall back to `DB_PASSWORD`. Neither set → `undefined` → connection fails (fail-fast).

### 8. Resolved/monitor: `@UseGuards` class metadata is now wired

`core/decorators/guards.ts` now writes class-level metadata in the shape read by `core/bootstrap.ts`, so class-level `@UseGuards(AuthGuard)` is honored.

Remaining work is policy design, not decorator wiring: decide which public endpoints stay public and which platform/admin controllers need explicit guard and role coverage.

### 9. Pending: `HttpExceptionFilter` and `@UseFilters` never registered

`shared/filters/http-exception.filter.ts` defines `HttpExceptionFilter` with `@Injectable()` and `core/decorators/filters.ts` defines `@UseFilters`, but neither is ever imported or registered. The bootstrap error handler in `bootstrap.ts:148-163` handles `HttpException` directly, but non-HttpException errors produce 500 responses with stack traces exposed by Fastify's default handler.

**Fix:** Register the exception filter globally in the bootstrap or in each module.

### 10. ✅ RESOLVED: dead config module removed

`infrastructure/config.ts` and `loadConfig()` were dead code — never called from `main.ts` or `bootstrap.ts`. File deleted.

**Remaining:** Add startup env var validation (e.g., `JWT_SECRET`, `DB_PASSWORD` must be set at boot).

---

## Phase 3 — Architecture & Completeness

### 11. ✅ RESOLVED: tenant DB schema types completed

`infrastructure/tenant-database/tenant-database.schema.ts` now defines types for **46 tables** (was 12):

**Added (34 new interfaces):**
- 27 `common_*` tables (countries, states, districts, cities, pincodes, contact_groups, contact_types, address_types, bank_names, product_groups, product_categories, product_types, units, hsn_codes, taxes, brands, colours, sizes, currencies, order_types, styles, transports, warehouses, destinations, payment_terms, months, stock_rejection_types)
- 4 sales entry tables (`sales_entries`, `sales_entry_items`, `sales_entry_comments`, `sales_entry_activities`)
- 3 master tables (`masters_contacts`, `masters_products`, `masters_orders`)

All marked with proper `Generated<number>` for auto-increment IDs, `boolean` for TINYINT(1) flags, and `Date` for datetime columns.

### 12. Resolved by structure: master-data is now a registry, not the common table owner

`modules/foundation/master-data` is now a compatibility registry/API for common definitions. Tenant table ownership moved to standalone common modules under `modules/common/<group>/<module>`, and tenant provisioning calls `migrateCommonModuleTables()` plus standalone master/entry migrations.

**Fix:** Do not call the generic master-data migration for current common/master tables. Keep the registry endpoint API-compatible while standalone modules own migrations.

### 13. Medium: master-data module registers TenantRepository/TenantDomainRepository but doesn't use them

`master-data.module.ts` imports both `TenantRepository` and `TenantDomainRepository` as providers, but `MasterDataService` only uses `TenantContextService`. The extra providers are dead weight.

### 14. Medium: queue has no worker/consumer

`infrastructure/queue/master-queue.service.ts` provides `enqueue()` and `listPending()` methods, but there is NO background worker or consumer that processes jobs. Jobs are enqueued (e.g., `tenant.database.provision` in `upsert-tenant.use-case.ts:58`) but never dequeued or executed.

**Fix:** Implement a queue worker that processes pending jobs, or remove the queue pattern if not needed.

### 15. Medium: accounting year seeding is inline in the provisioner

`tenant-database.connection.ts:496-533` contains `seedAccountingYears()` as a local function rather than in the `accounting-year` common module. This creates a maintenance burden when the accounting year schema changes.

**Fix:** Move `seedAccountingYears()` into the accounting-year common module's seeder.

### 16. Low: `MasterRecordEventBus` and `TenantEventBus` are in-memory — events lost on restart

`core/tenant/application/tenant-event-bus.ts` and `foundation/master-record/application/services/master-record-event-bus.ts` both store events in plain arrays. On server restart, ALL events are lost.

**Fix:** Persist events to the database if audit trails are needed.

---

## Phase 4 — Code Quality & Reliability

### 17. ✅ RESOLVED: UUID generation improved

All public record UUID creation now goes through the shared 8-character uppercase alphanumeric helper (fits the existing `CHAR(8)` column). Full UUID migration (`crypto.randomUUID()` + `CHAR(36)`) deferred.

### 18. Pending: no request body validation

None of the controllers have validation pipes, class-validator decorators, or any request body validation beyond basic null checks in service methods. Invalid/unexpected input types propagate into database queries, potentially causing confusing errors or SQL warnings.

**Recommended approach:** Add a `@Validate(schema)` decorator and/or a `ValidationPipe` at the bootstrap level using Zod.

### 19. Low: duplicate routes in TenantsV1Controller

`@Delete(':id')` and `@Post(':id/destroy')` both call `this.tenantService.softDelete()`. The `@Post(':id/destroy')` route is redundant — and misnamed, since it does a soft delete, not a hard destroy.

**Fix:** Remove the duplicate `@Post(':id/destroy')` route, or rename it to `:id/soft-delete` if both are intentionally needed.

### 20. ✅ RESOLVED: 3 dead code files deleted

| File | Action |
|---|---|
| `infrastructure/shutdown.ts` | Deleted |
| `infrastructure/config.ts` | Deleted |
| `shared/guards/simple.guard.ts` | Deleted |

Remaining unused infrastructure (HttpExceptionFilter, RequestLoggerMiddleware, middleware decorators/interfaces) not yet cleaned up.

### 21. ✅ RESOLVED: `isEmptyDeletedAt` handles string inputs

Fixed `resolve-tenant-context.use-case.ts:124` — type widened to `Date | string | null | undefined`. String values return `false` (non-empty), `instanceof Date` branches to `getTime()` check as before.

---

## Summary

The main gap is not database separation. It is boundary enforcement. The app has tenant-specific databases, but the platform/admin surface is mostly unprotected, and tenant selection is caller-steerable instead of being bound to the request host and session.

**Priority order for fixes:**
1. Lock down all platform controllers with explicit auth and role guards (items 1-4; item 8 decorator wiring is fixed)
2. Remove hardcoded secrets and add env var validation (items 5-7, 10)
3. Complete tenant DB schema types (item 11)
4. Complete queue worker design and module event processing (item 14; item 12 is resolved by standalone module ownership)
5. Code quality improvements (items 17-21)
