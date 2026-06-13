# ZETRO Documentation Indexing

ZETRO search is audience-filtered.

## Source Classes

- Public/user docs: safe for read-only and tenant user surfaces.
- Policy docs: safe rules that may guide every surface.
- Admin docs: setup and operations docs for super-admin only.
- System docs: indexing, provider, and implementation behavior for super-admin only.
- Developer docs: not used by ZETRO runtime retrieval. Developer planning files stay outside chat knowledge.

## Runtime Behavior

The backend should search only the source classes allowed by the verified audience. Runtime retrieval is restricted to `ZRO/ZETRO` docs. User chat must not receive excerpts from `assist/`, broad roadmap docs, source files, or implementation notes.

## Learn Behavior

Learning/indexing should store source metadata including source audience and category. A future database-backed retrieval layer should filter by audience before adding context to prompts.

## Recommended Update Behavior

Recommended updates belong to super-admin surfaces. User and public surfaces should not display provider setup reminders, model warnings, or docs indexing operations.
