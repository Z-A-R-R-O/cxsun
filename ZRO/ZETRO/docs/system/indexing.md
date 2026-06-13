# ZETRO Documentation Indexing

ZETRO search is audience-filtered.

## Source Classes

- Public/user docs: safe for read-only and tenant user surfaces.
- Policy docs: safe rules that may guide every surface.
- Admin docs: setup and operations docs for super-admin only.
- System docs: indexing, provider, and implementation behavior for super-admin only.
- Developer docs: `assist/` and broad ZRO planning context, used only by super-admin implementation surfaces.

## Runtime Behavior

The backend should search only the source classes allowed by the verified audience. User chat must not receive excerpts from `assist/` or broad roadmap docs. Only super-admin chat can use broader context when needed.

## Learn Behavior

Learning/indexing should store source metadata including source audience and category. A future database-backed retrieval layer should filter by audience before adding context to prompts.

## Recommended Update Behavior

Recommended updates belong to super-admin surfaces. User and public surfaces should not display provider setup reminders, model warnings, or docs indexing operations.
