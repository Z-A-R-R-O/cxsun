# Blog

## Summary
Full-featured blog content management system with post lifecycle, hierarchical categories, tags, nested comments with approval workflow, image attachments, per-post SEO metadata, and reusable frontend components for static pages.

## Module Structure

### Backend (`apps/server/src/modules/blog/`)
| File | Purpose |
|------|---------|
| `blog.types.ts` | TypeScript interfaces for all 7 entities: BlogPost, BlogCategory, BlogTag, BlogComment, BlogImage, BlogSeo, BlogWorkspace |
| `blog.migration.ts` | DDL for 7 tables with proper indexes, foreign keys via application logic |
| `blog.repository.ts` | Full CRUD with upsert pattern, soft delete, pagination, search, tag/category/post-count joins |
| `blog.service.ts` | Thin delegation layer, tenant context resolution with `company.manage` policy |
| `blog.controller.ts` | RESTful endpoints under `/api/v1/blog/*` |
| `blog.module.ts` | Module registration with DI providers |
| `index.ts` | Public exports |

### Database Tables (7)
1. **blog_categories** — Hierarchical categories with parent_id, sort_order, slug
2. **blog_tags** — Flat tag taxonomy with unique slugs
3. **blog_posts** — Core content table with status (draft/published/archived), featured_image, view_count, published_at
4. **blog_post_tags** — Many-to-many junction with unique (post_id, tag_id)
5. **blog_comments** — Nested replies (parent_id), approval workflow (is_approved, approved_by, approved_at)
6. **blog_images** — Post-scoped images with filename, mime_type, size, url, alt_text, caption, sort_order
7. **blog_seo** — One-to-one with posts (meta_title, meta_description, meta_keywords, canonical_url, OG tags, schema_markup, no_index)

### API Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/blog` | Workspace summary (all posts, categories, tags, recent comments, counts) |
| GET | `/api/v1/blog/posts` | List posts with optional filters (status, category, tag, search) |
| GET | `/api/v1/blog/posts/:id` | Single post with category, tags, seo, comment count |
| POST | `/api/v1/blog/posts/upsert` | Create or update post (with tag_ids and seo payload) |
| POST | `/api/v1/blog/posts/:id/delete` | Soft-delete post |
| GET | `/api/v1/blog/categories` | List all categories with post counts |
| POST | `/api/v1/blog/categories/upsert` | Create or update category |
| POST | `/api/v1/blog/categories/:id/delete` | Soft-delete category (orphans uncategorized) |
| GET | `/api/v1/blog/tags` | List all tags with post counts |
| POST | `/api/v1/blog/tags/upsert` | Create or update tag |
| POST | `/api/v1/blog/tags/:id/delete` | Hard-delete tag and junction rows |
| GET | `/api/v1/blog/comments` | List comments with optional post_id, is_approved, search |
| POST | `/api/v1/blog/comments/upsert` | Create or update comment |
| POST | `/api/v1/blog/comments/:id/approve` | Approve pending comment |
| POST | `/api/v1/blog/comments/:id/delete` | Soft-delete comment |
| GET | `/api/v1/blog/images` | List images with optional post_id filter |
| POST | `/api/v1/blog/images/upsert` | Create or update image |
| POST | `/api/v1/blog/images/:id/delete` | Soft-delete image |

## What We Done
- Blog dashboard app with 6 tabs: Posts, Categories, Tags, Comments, Images, SEO
- Full post editor with title, slug, excerpt, content (Markdown/HTML), featured image, publish status, category selector, tag toggle chips, featured/allow-comments toggles
- SEO settings panel per post (meta title/description/keywords, canonical URL, OG tags, no-index toggle)
- Category management with parent selection, sort order, auto-count
- Tag management with slug auto-generation
- Comment moderation with approve/delete workflow and nested replies
- Image attachment tracking per post
- View counter for posts
- Reusable frontend components: `BlogPostCard`, `BlogPostGrid`, `BlogCategoryBadge`, `BlogTagBadge`, `BlogCategoryList`, `BlogTagList`, `BlogSidebar` for static/public pages
- Backend migration with 7 tenant-scoped tables, proper indexing, soft delete pattern
- All endpoints wired into dashboard sidebar, breadcrumbs, and routing

## Gaps
- No rich text editor (uses plain textarea — can plug Tiptap or similar)
- No image upload endpoint (requires media integration or S3/Blob storage)
- No scheduled publishing (published_at is set immediately on status change)
- No RSS/Atom feed endpoint
- No public frontend blog routes (components are ready but not wired into site router)
- No email notification on new comments
- No spam filtering for comments
- No post revision history
- No bulk operations (bulk publish, bulk delete)

## Future Concepts
- Rich text editor integration (Tiptap, Quill, or Slate)
- Media library integration with drag-and-drop image upload
- Scheduled/pending publish with cron
- RSS/Atom feed generation
- Public blog listing with pagination, category/tag filtering, search
- Comment spam filter (Akismet or custom ML)
- Email notifications for new comments and replies
- Post revision/draft versioning
- Bulk actions (publish, archive, delete, categorize) from the posts list
- Permalink customization (custom URL patterns)
- Blog import/export (WordPress XML, Medium, Ghost)
- Multi-language/localization support
