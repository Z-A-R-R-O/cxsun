# ZETRO Super-Admin Review

Super-admin can review what clients repeatedly ask ZETRO.

## Review Signals

- Recent client questions.
- Mapped query intent such as `sales.summary`, `purchase.summary.by_contact`, `customer.balance`, `supplier.balance`, `sales.bill.detail`, or `purchase.bill.detail`.
- Tenant and role metadata.
- Tool used by ZETRO.
- Repeated normalized questions.
- Out-of-scope or restricted question patterns.
- Missing-input patterns where clients ask for a bill or balance without the required contact or document number.

## Purpose

The review log helps decide which product reports, shortcuts, docs, or safe read-only tools should be added next.

When repeated questions appear, super-admin can map them into approved read-only tools or add user docs. New tools must keep the same tenant boundary and must not expose code, table, prompt, provider, model, file, or event-bus details to clients.

## Query Registry Workflow

- Review repeated questions and recent registry logs in the ZETRO Queries page.
- Review mapping candidates generated from recent chat logs before adding aliases.
- Add approved phrases only when they map to an existing read-only tool.
- Use exact matching for fixed phrases and contains matching only for safe broad aliases.
- Do not map phrases to tools that need missing information unless ZETRO can ask the client for that information first.
- Keep policy and behavior in markdown docs; keep live aliases, mappings, and usage logs in the database.

## Safety

Review screens must not expose API keys, provider secrets, raw prompts, source code, or cross-tenant private data to restricted users. Full review is super-admin-only.
