i have mad fix .env align this software to get .env and process first load

make full set auth process with tenant id , make login page and user list + Upsert like common list with role and
permission

prepare complete set of rabc policy for all modules and connect with user and prepare gate for authorisation

make this complete plan and task and implement one by one

make sure read temp/ login front end page and do this in same tone

user can login with user name or email and tenant is decided by software after login and send to frontend + generate JWT
token and store in session for front end

make sure with proper modular + DDD + event driven login system inside Auth folder

Implemented the auth/RBAC foundation an verified it on dev.

What’s done:

- `.env` is loaded first on server boot
  via [bootstrap-env.ts](D:/Workspace/websites/cxnext/apps/server/src/bootstrap-env.ts).
- Preflight now checks DB vars plus `JWT_SECRET` before startup.
- Added Auth/RBAC DB migration + seeder:
    - users, sessions, roles, permissions, user roles, role permissions
    - seeded module policies for auth, tenant, industry, company, contact, product, sales, purchase, payment, receipt,
      common
    - seeded default admin user
- Added DDD-style Auth module under [auth](D:/Workspace/websites/cxnext/apps/server/src/modules/auth):
    - login by username or email
    - tenant resolved after login
    - JWT issued with session id, tenant id, user id, permissions
    - session stored server-side
    - `/auth/me`, `/auth/logout`, `/auth/users`, `/auth/roles`, `/auth/permissions`
    - authorization guard using permissions
    - login domain event published through the existing event bus
- Updated frontend:
    - login form now accepts username/email
    - stores JWT session locally
    - added Admin → Users page
    - added user create/edit upsert screen with tenant + roles
    - kept the login UI tone aligned with the existing auth page

Verified:

- `corepack pnpm db:prepare` passes
- `corepack pnpm --filter @cxnext/server typecheck` passes
- `corepack pnpm --filter @cxnext/frontend typecheck` passes
- `corepack pnpm --filter @cxnext/server... build` passes
- `http://localhost:4000/health` returns `200`
- `http://localhost:3000/login` returns `200`
- `http://localhost:3000/desk/admin/users` returns `200`
- Login smoke test passed with username and email.

Dev login:

- Username: `admin`
- Email: `admin@cxnext.local`
- Password: `Admin@12345`

One important note: the RBAC policy and Auth gate are now in place and active on Auth/admin endpoints. I did not
force-gate every existing business API yet because several current frontend feature APIs still call the backend without
attaching the stored JWT; flipping all controllers at once would break Sales/Contacts/Products screens immediately. The
safe next slice is to convert those feature APIs to `authFetch`, then add `RequirePermissions(...)` decorators to each
module controller.

We’ve got the RBAC layer into a much healthier place now.

I finished the modular permission pass so the backend and frontend are both speaking the same module/action language.
The shared catalog lives
in [D:\Workspace\websites\cxnext\packages\types\src\auth\rbac-catalog.ts](D:/Workspace/websites/cxnext/packages/types/src/auth/rbac-catalog.ts),
the auth guard resolves both static and dynamic permissions
in [D:\Workspace\websites\cxnext\apps\server\src\modules\auth\interface\http\auth.guard.ts](D:/Workspace/websites/cxnext/apps/server/src/modules/auth/interface/http/auth.guard.ts),
and the module-specific decorators now cover the business controllers plus entry-kind routing. I also kept the auth
bounded context event-driven by publishing auth user lifecycle events from the auth use cases.

On the app side, I patched the feature API clients to use the shared authenticated transport instead of raw `fetch`,
including [D:\Workspace\websites\cxnext\apps\frontend\features\sales\infrastructure\sales-api.ts](D:/Workspace/websites/cxnext/apps/frontend/features/sales/infrastructure/sales-api.ts), [D:\Workspace\websites\cxnext\apps\frontend\features\product\infrastructure\product-api.ts](D:/Workspace/websites/cxnext/apps/frontend/features/product/infrastructure/product-api.ts), [D:\Workspace\websites\cxnext\apps\frontend\features\common\infrastructure\common-api.ts](D:/Workspace/websites/cxnext/apps/frontend/features/common/infrastructure/common-api.ts),
and the rest of the desk module clients. I also fixed the auth pages to build cleanly by wrapping the shared client auth
form in `Suspense`
at [D:\Workspace\websites\cxnext\apps\frontend\app\(auth)\login\page.tsx](D:/Workspace/websites/cxnext/apps/frontend/app/(auth)/login/page.tsx), [D:\Workspace\websites\cxnext\apps\frontend\app\(auth)\register\page.tsx](D:/Workspace/websites/cxnext/apps/frontend/app/(auth)/register/page.tsx),
and [D:\Workspace\websites\cxnext\apps\frontend\app\(auth)\password-reset\page.tsx](D:/Workspace/websites/cxnext/apps/frontend/app/(auth)/password-reset/page.tsx).

A practical bit mattered too: the shared `@cxnext/types` package wasn’t linked into the workspace runtime, so I wired
that
into [D:\Workspace\websites\cxnext\apps\server\package.json](D:/Workspace/websites/cxnext/apps/server/package.json), [D:\Workspace\websites\cxnext\packages\db\package.json](D:/Workspace/websites/cxnext/packages/db/package.json),
the relevant `tsconfig`s, and refreshed the workspace install. Then I ran the auth RBAC sync directly once against the
live DB so the expanded role catalog actually exists in the current environment.

Verification went well:

- `corepack pnpm --filter @cxnext/types typecheck`
- `corepack pnpm --filter @cxnext/types build`
- `corepack pnpm --filter @cxnext/server typecheck`
- `corepack pnpm --filter @cxnext/db typecheck`
- `corepack pnpm --filter @cxnext/frontend typecheck`
- `corepack pnpm --filter @cxnext/frontend build`
- `node tests/e2e/auth-system-smoke.js` -> passed
- live RBAC probe: a `sales_viewer` user got `sales.read`, could access `/entries/sales` with `200`, and was blocked
  from `/products` and `/auth/users` with `403`

The one remaining non-blocker is a Next.js deprecation
warning: [D:\Workspace\websites\cxnext\apps\frontend\middleware.ts](D:/Workspace/websites/cxnext/apps/frontend/middleware.ts)
should eventually move to the newer `proxy` convention. Functionally it’s working right now.

The app is currently up on `http://localhost:3000` and the API on `http://127.0.0.1:4000`. The next worthwhile pass
would be adding a dedicated role-matrix e2e suite so `viewer`, `operator`, `admin`, and `manager` keep
their boundaries over time.
