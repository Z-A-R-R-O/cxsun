# Blog Module Prompt

Use this prompt when planning or implementing a full blogging and publishing system in `cxnext`.

The goal is to fit a complete blog experience into the current repository shape:

- NestJS backend under `apps/server`
- Next.js frontend under `apps/frontend`
- public web routes under `app/(web)`
- authenticated desk routes under `app/(app)`
- modular monolith boundaries
- DDD application flow
- event-driven cross-module integration
- versioned browser APIs under `/api/v1`
- shared media storage already present in the repo

This file is prompt-only. It should guide implementation without inventing a second architecture beside the one already used in this repo.

## Objective

Create a production-ready blog system that covers the full blogging lifecycle:

- authoring
- draft autosave
- rich editing with TipTap
- multi-image support
- editorial review
- scheduled publishing
- public reading experience
- comments
- replies
- likes
- share tracking
- moderation
- SEO and discovery
- analytics and reporting

The blog should support bloggers from first draft through long-term post maintenance.

## Required Backend Placement

Create blog as one backend bounded context:

```text
apps/server/src/modules/blogs/
  blogs.definition.ts
  blogs.module.ts
  blogs.registry.ts
  domain/
    entities/
    value-objects/
    aggregates/
    events/
  application/
    use-cases/
    services/
  infrastructure/
    persistence/
    adapters/
  interface/
    http/
    graphql/
  database/
    migrations/
    seeder/
```

Follow the same registry pattern used by the existing backend modules:

- `blogs.definition.ts` declares the module name and bounded context.
- `blogs.registry.ts` registers the module through `ModuleRegistryService`.
- `blogs.module.ts` owns the Nest wiring for controllers, providers, and adapters.

Do not create a parallel tree such as `modules/blog/editor`, `modules/blog/review`, or `modules/blog/storage` outside the standard module shape.

## Required Frontend Placement

Create the frontend blog feature here:

```text
apps/frontend/features/blog/
  domain/
  application/
  infrastructure/
  interface/
    pages/
    components/
```

Use two route surfaces:

```text
apps/frontend/app/(web)/blog/
apps/frontend/app/(app)/desk/blog/
```

Public web routes should render published content only.

Desk routes should handle authoring, editorial review, moderation, analytics, and post management.

App route files should stay thin and import their pages from `features/blog/interface/pages/`.

## Runtime Position

- `apps/server` owns blog content rules, publishing workflow, comment and engagement behavior, persistence, and API orchestration.
- `apps/frontend` owns the public reading experience and authenticated editorial/admin UI.
- `media` remains the storage mechanism for uploaded images and public assets.
- `auth` remains the source of user identity, roles, and permissions.

The blog module must not reimplement file storage or user management.

## Core Scope

The prompt must cover the full feature set below.

### Content Authoring

- create draft posts
- edit existing drafts and published posts
- autosave draft state
- preview before publish
- slug editing with uniqueness checks
- manual excerpt and fallback excerpt generation
- author bio and byline display
- categories
- tags
- optional post series
- featured or pinned post state
- archive and unpublish flow

### TipTap Editor

Use TipTap as the authoring editor.

Required editor capabilities:

- TipTap JSON as the canonical stored document format
- sanitized rendered HTML or render output for public delivery
- toolbar commands
- slash commands
- keyboard shortcuts
- headings
- paragraphs
- bold, italic, underline, strike
- blockquote
- bullet list
- ordered list
- task list
- code block
- horizontal rule
- table support if explicitly enabled
- callout or note blocks
- link support
- inline image blocks
- multi-image gallery blocks
- caption support
- alt text support
- drag/drop and paste image insertion
- editor undo/redo
- reading time calculation

Do not reduce authoring to a plain textarea or raw HTML field.

### Multi-Image Support

Support multiple image patterns:

- hero image
- cover image
- inline editor images
- gallery images
- optional OG/social image override

Each image reference should support:

- media path or asset reference
- alt text
- caption
- sort order
- width/height when available
- focal point or crop metadata if later added

The blog module should persist image references and metadata, not the raw binary files themselves.

### Editorial Review Workflow

Support a real review lifecycle:

- draft
- in_review
- changes_requested
- approved
- scheduled
- published
- unpublished
- archived

Review capabilities:

- submit for review
- assign reviewer
- review notes
- approve
- request changes
- schedule publish time
- publish immediately
- unpublish
- version history and revision restore

Treat "reviews" here as editorial workflow, not only public reactions.

### Comments, Replies, Likes, Share

Required public engagement capabilities:

- comments on published posts
- threaded replies
- comment moderation status
- post likes
- comment likes
- share actions and share counts
- abuse report or moderation flag support

Comment flow should support:

- pending moderation when needed
- approved
- rejected
- hidden

Do not couple comment writes directly to post editing logic.

### Discovery And SEO

Support the expected blog discovery surfaces:

- public post listing
- post detail by slug
- category listing
- tag listing
- author page
- archive listing
- search
- related posts
- canonical URL
- SEO title
- meta description
- Open Graph fields
- social image
- sitemap inclusion
- RSS or feed output

### Analytics And Reporting

At minimum support:

- view count
- like count
- comment count
- share count
- publish date
- scheduled date
- updated date
- top posts
- drafts waiting for review
- comments waiting for moderation

Do not overcomplicate analytics in the first slice. Simple tracked counters and report queries are enough unless a broader analytics module is requested.

## Domain Model

Keep domain behavior inside the blog module.

Good candidates:

- `BlogPost` aggregate root
- `BlogRevision`
- `BlogCategory`
- `BlogTag`
- `BlogComment`
- `BlogCommentReply` or threaded `BlogComment`
- `BlogPostImage`
- `BlogEditorialReview`
- `BlogAuthorProfile`
- `BlogPostLike`
- `BlogCommentLike`
- `BlogShareEvent`

Good value objects:

- `BlogPostStatus`
- `BlogSlug`
- `EditorDocument`
- `PublishWindow`
- `CommentStatus`
- `ShareChannel`

Do not import entities or aggregates from other modules into the blog domain.

## Cross-Module Boundaries

The blog module may integrate with other parts of the repo only through explicit boundaries.

### Auth Boundary

- Use `auth` for editor/reviewer identity.
- Do not duplicate user or role tables in `blogs`.
- If finer blog permissions are needed, extend the shared auth policy catalog deliberately before implementation.

Recommended permission direction:

- `blog.read`
- `blog.list`
- `blog.create`
- `blog.update`
- `blog.delete`
- `blog.report`

If blog needs finer actions such as `publish`, `review`, or `moderate`, extend the shared auth catalog first instead of inventing ad hoc permission strings in controllers.

### Media Boundary

- Reuse the existing media/storage path.
- Store only media references in blog records.
- Uploads should go through the media capability already present in the repo.
- If blog needs tighter integration, add a public media contract instead of importing `media` internals.

### Optional Context Boundary

This repo already supports tenant and company-aware data.

Blog records should be at least tenant-aware, and may also be company-aware when the public blog is brand-specific.

Recommended context fields:

- `tenant_id`
- optional `company_id`
- author user id
- reviewer user id where applicable

## Event Pattern

Use the existing event-first approach for meaningful blog facts:

- `blog.post-drafted`
- `blog.post-submitted-for-review`
- `blog.post-approved`
- `blog.post-published`
- `blog.post-unpublished`
- `blog.comment-added`
- `blog.reply-added`
- `blog.comment-moderated`
- `blog.post-liked`
- `blog.shared`

Rules:

- publish domain events after successful state changes
- keep handlers idempotent where practical
- use events for notifications, counters, search indexing, or future sync hooks
- do not put cross-module side effects directly in controllers

## Application Layer Shape

Use cases should orchestrate workflow and persistence.

Typical use cases:

- `CreateBlogPostUseCase`
- `UpdateBlogPostUseCase`
- `AutosaveBlogDraftUseCase`
- `SubmitBlogPostForReviewUseCase`
- `ApproveBlogPostUseCase`
- `RequestBlogChangesUseCase`
- `ScheduleBlogPostUseCase`
- `PublishBlogPostUseCase`
- `UnpublishBlogPostUseCase`
- `RestoreBlogRevisionUseCase`
- `ListPublishedBlogPostsUseCase`
- `GetPublishedBlogPostBySlugUseCase`
- `CreateBlogCommentUseCase`
- `ReplyToBlogCommentUseCase`
- `ModerateBlogCommentUseCase`
- `LikeBlogPostUseCase`
- `LikeBlogCommentUseCase`
- `TrackBlogShareUseCase`
- `ListBlogAnalyticsUseCase`

Application ports should end with `Port`.

Good candidates:

- `BlogPostRepositoryPort`
- `BlogCommentRepositoryPort`
- `BlogReviewRepositoryPort`
- `BlogAnalyticsRepositoryPort`
- `BlogMediaPort`
- `BlogSearchPort`

## Versioned HTTP API

Keep blog HTTP endpoints inside the existing versioned API surface.

Public read endpoints:

- `GET /api/v1/blog/posts`
- `GET /api/v1/blog/posts/:slug`
- `GET /api/v1/blog/categories`
- `GET /api/v1/blog/tags`
- `GET /api/v1/blog/authors/:slug`
- `GET /api/v1/blog/posts/:slug/comments`

Public engagement endpoints:

- `POST /api/v1/blog/posts/:slug/comments`
- `POST /api/v1/blog/comments/:commentId/replies`
- `POST /api/v1/blog/posts/:slug/likes`
- `POST /api/v1/blog/comments/:commentId/likes`
- `POST /api/v1/blog/posts/:slug/share`

Protected editorial/admin endpoints:

- `GET /api/v1/blog/admin/posts`
- `POST /api/v1/blog/admin/posts`
- `PATCH /api/v1/blog/admin/posts/:postId`
- `POST /api/v1/blog/admin/posts/:postId/submit-review`
- `POST /api/v1/blog/admin/posts/:postId/approve`
- `POST /api/v1/blog/admin/posts/:postId/request-changes`
- `POST /api/v1/blog/admin/posts/:postId/schedule`
- `POST /api/v1/blog/admin/posts/:postId/publish`
- `POST /api/v1/blog/admin/posts/:postId/unpublish`
- `GET /api/v1/blog/admin/comments`
- `POST /api/v1/blog/admin/comments/:commentId/moderate`
- `GET /api/v1/blog/admin/reports`

Guidance:

- prefer HTTP as the primary transport
- GraphQL is optional and should not be the default for the first blog slice
- validate DTOs at the boundary with the repo validation approach
- public write endpoints should include abuse protection and moderation rules

## Persistence Placement

Keep blog persistence under the module:

```text
apps/server/src/modules/blogs/infrastructure/persistence/
apps/server/src/modules/blogs/database/migrations/
apps/server/src/modules/blogs/database/seeder/
```

Expected tables:

- `blog_posts`
- `blog_post_revisions`
- `blog_categories`
- `blog_tags`
- `blog_post_tags`
- `blog_post_images`
- `blog_editorial_reviews`
- `blog_comments`
- `blog_comment_likes`
- `blog_post_likes`
- `blog_share_events`
- optional `blog_author_profiles`

Recommended post columns:

- `tenant_id`
- optional `company_id`
- `slug`
- `title`
- `excerpt`
- `editor_document_json`
- `rendered_html`
- `status`
- `hero_image_path`
- `social_image_path`
- `published_at`
- `scheduled_at`
- `author_user_id`
- `reviewer_user_id`
- timestamps
- soft delete fields when needed

Module-local migrations and seeders must also be wired into the central DB runner used by `packages/db`. Creating the module migration files alone is not enough.

## Public Web Experience

Public routes should support:

- blog landing page
- paginated post list
- post detail page
- category and tag pages
- author page
- related posts
- share bar
- comments section
- reply threads
- like action

Public pages should be content-first, readable, SEO-aware, and use real post imagery when available.

## Desk Experience

Desk routes should support:

- blog dashboard
- post list
- new post
- edit post
- revision history
- review queue
- scheduled queue
- comments moderation queue
- analytics summary
- category and tag management

The authoring surface should feel like a real editor, not a plain CRUD form.

## TipTap Command Requirements

The editor command set should cover:

- heading level changes
- paragraph conversion
- bold
- italic
- underline
- strike
- bullet list
- ordered list
- task list
- quote
- code block
- divider
- link insert/edit
- image insert
- multi-image gallery insert
- callout insert
- undo
- redo

Slash commands should at least expose:

- heading
- image
- gallery
- quote
- list
- callout
- code block
- divider

## Moderation And Safety

Comment and engagement features need moderation boundaries.

Support:

- comment approval states
- moderation notes
- rate limiting or anti-spam guardrails
- soft delete or hide behavior
- author/reviewer/admin-only moderation actions

Do not expose unrestricted anonymous writes without moderation or abuse controls.

## Testing Expectations

Minimum validation for a real implementation:

- architecture tests for module boundaries
- server tests for post workflow, comment flow, likes, and shares
- tests for review status transitions
- tests for public published-only visibility
- tests for moderation behavior
- tests for slug uniqueness and revision restore
- frontend tests for editor shell, list/detail flows, and moderation pages

## Anti-Patterns

Do not:

- store only raw unsafe HTML as the canonical editor source
- put TipTap state orchestration directly in route files
- duplicate user management inside the blog module
- duplicate binary image storage inside the blog module
- make public post detail depend on authenticated desk state
- couple comments, likes, and shares directly to post edit controllers
- skip revision history once rich editing exists
- invent permission keys in controllers without updating the shared auth policy catalog
- add a flat `blog.ts` feature outside the strict frontend/backend module structure

## Expected Deliverables For A Blog Batch

For a real implementation batch, aim to deliver:

1. backend `blogs` bounded context shell
2. frontend `blog` feature shell
3. public blog list and detail pages
4. desk authoring and review pages
5. TipTap editor integration
6. media-backed image references with multi-image support
7. comments, replies, likes, and share tracking
8. editorial review workflow
9. blog-specific permissions and guards
10. module-local migrations plus DB runner registration
11. tests for boundaries and behavior

## Pattern Fit Checklist

Before accepting any blog implementation, confirm all of the following:

- backend code lives under `apps/server/src/modules/blogs`
- frontend feature code lives under `apps/frontend/features/blog`
- public blog pages live under `app/(web)`
- editorial/admin pages live under `app/(app)/desk`
- module registration follows the existing registry bootstrap pattern
- APIs use `/api/v1`
- boundary DTOs use the repo validation approach
- domain code stays framework-free
- media storage is reused rather than duplicated
- auth identity is reused rather than duplicated
- events publish meaningful post/comment facts
- migrations and seeders are wired into the central DB runner
- public content stays readable without desk coupling
- comments, replies, likes, and shares are modeled as separate behavior, not hidden side effects of post saves
