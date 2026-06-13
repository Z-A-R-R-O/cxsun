# ZETRO Super-Admin Review

Super-admin can review what clients repeatedly ask ZETRO.

## Review Signals

- Recent client questions.
- Mapped query intent such as `sales.summary` or `purchase.summary.by_contact`.
- Tenant and role metadata.
- Tool used by ZETRO.
- Repeated normalized questions.
- Out-of-scope or restricted question patterns.

## Purpose

The review log helps decide which product reports, shortcuts, docs, or safe read-only tools should be added next.

## Safety

Review screens must not expose API keys, provider secrets, raw prompts, source code, or cross-tenant private data to restricted users. Full review is super-admin-only.
