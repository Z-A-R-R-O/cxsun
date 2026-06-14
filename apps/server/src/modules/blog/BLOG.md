# Blog — Server Module

## Summary
Server-side blog content management module. Provides RESTful API endpoints for blog posts, categories, tags, comments, images, and SEO metadata. Tenant-scoped via TenantContextService.

## Tables (7)
- blog_posts, blog_categories, blog_tags, blog_post_tags, blog_comments, blog_images, blog_seo

## API
All endpoints under `/api/v1/blog/*`. See `apps/frontend/src/features/blog/BLOG.md` for full endpoint table.
