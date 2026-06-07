# SITE

## Summary
Manages tenant landing pages, static site content, and contact message collection. Provides domain-based tenant site resolution with dynamic content built from tenant metadata (name, industry, enabled apps, companies). Includes a slider sub-module for managing banner/slider content with event-driven lifecycle.

## What We Done
- Tenant landing page content retrieval (pages, services, posts from DB)
- Domain-based tenant static site resolution with dynamic content generation
- Contact/enquiry message creation with tenant attribution
- Slider CRUD with published status management
- Slider event bus integration via MasterQueueService
- Slider DDD sub-module with domain events, application service, and repository
- Multi-tenant data isolation via TenantContextService
- Database migrations for site pages, services, posts, messages, and sliders

## Gaps
- No CMS-style page editor (static content is code-generated via buildTenantStaticContent)
- No SEO metadata management (meta titles, descriptions, OG tags)
- No site theming or branding customization UI
- No blog/article management workflow
- No multi-language/internationalization support for tenant sites
- No analytics or visitor tracking
- No site maintenance mode or downtime page

## Future Concepts
- WYSIWYG page editor with drag-drop components
- SEO configuration per page with auto-generated sitemap
- Theme and branding customization with live preview
- Blog engine with categories, tags, and author management
- Multi-language content with translation workflow
- Visitor analytics dashboard with page views and engagement
- Site builder with customizable templates and blocks
