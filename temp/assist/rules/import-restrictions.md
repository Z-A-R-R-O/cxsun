# Import Restrictions

Allowed cross-boundary imports:

- `@cxnext/core`
- `@cxnext/event`
- `@cxnext/db`
- `@cxnext/validation`
- `@cxnext/config`
- `@cxnext/utils`
- `@cxnext/types`
- Public contracts exported by future modules

Forbidden imports:

- `apps/server/src/modules/*/domain` from another module.
- `apps/server/src/modules/*/application` from another module.
- `apps/server/src/modules/*/infrastructure` from another module.
- Framework packages inside domain files.
