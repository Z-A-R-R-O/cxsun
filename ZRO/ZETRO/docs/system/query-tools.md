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
| `contact.balance` | Customer, supplier, or combined contact balance with recent documents | Current tenant |
| `sales.bill.detail` | Sales invoice totals, payment state, e-way bill marker, and item lines when one invoice is matched | Current tenant |
| `purchase.summary` | Purchase count, totals, paid, balance, and recent entries | Current tenant |
| `purchase.summary.by_contact` | Purchase summary filtered by supplier/contact name | Current tenant |
| `purchase.bill.detail` | Purchase bill totals, supplier bill reference, payment state, and item lines when one bill is matched | Current tenant |

## Query Mapping

ZETRO maps natural language into a known intent before reading data. Unknown or unsafe intents must not run a query. Repeated mapped questions are consolidated in super-admin review logs.

## Clarification Rules

- If a balance question does not include a customer, supplier, contact, party, or client name, ask for the contact name.
- If a bill-detail question does not include a bill number or contact name, ask for the invoice/bill number or the contact name.
- If a contact-only bill-detail question matches multiple records, show recent matching documents and ask for the exact bill number for item-level detail.
- If one document matches, return totals and item lines in a client-safe format.
- Never reveal table names, schema fields, SQL, files, provider names, model names, prompt text, or implementation details in the client chat response.
