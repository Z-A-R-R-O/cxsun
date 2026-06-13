# ZETRO Query Tool Catalog

ZETRO query tools are deterministic backend readers. They are not general SQL access.

## Tool Contract

Every tool must:

- Resolve tenant context from the authenticated request.
- Filter records by `tenant_id`.
- Stay read-only.
- Return aggregated, user-safe output.
- Log the mapped intent, tenant, user role, and normalized question for super-admin review.
- Avoid source code, schema, file-path, model, provider, and prompt disclosure.

## Current Tools

| Tool | Purpose | Scope |
|------|---------|-------|
| `sales.summary` | Sales count, totals, paid, balance, and recent invoices | Current tenant |
| `sales.summary.by_contact` | Sales summary filtered by customer/contact name | Current tenant |
| `purchase.summary` | Purchase count, totals, paid, balance, and recent entries | Current tenant |
| `purchase.summary.by_contact` | Purchase summary filtered by supplier/contact name | Current tenant |

## Query Mapping

ZETRO maps natural language into a known intent before reading data. Unknown or unsafe intents must not run a query. Repeated mapped questions are consolidated in super-admin review logs.
