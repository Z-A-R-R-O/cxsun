# Work Log

## 2026-06-03

- Added the tenant-aware Mail app surface with Mail Desk navigation, compose, inbox, drafts, scheduled, sent, trash, contacts, and tenant mail settings.
- Added backend tenant mail tables, settings/default fallback support from environment variables, queued message storage, attachments, events, and SMTP dispatch through the mail queue lane.
- Verified live Hostinger SMTP settings and confirmed a queued tenant mail message could be sent through the dispatcher.
- Reworked Mail Settings controls with proper select sizing and a green active tenant-mail switch.
- Reworked the Mail Inbox into the existing Sales-style workspace flavour with top `Refresh` and `New` actions, search/filter/column toolbar, table row action dropdown, view dialog, trash action, and pagination.
- Removed the duplicate inner Mail sidebar so the outer Mail Desk side menu owns the full flow.

## 2026-05-23

- Added the Media application as a standalone tenant module with library, link, sharing, upload, delete, public/private storage, and queue-backed backend events.
- Added an application-wide media picker popup and connected Company logo upload/selection to the picker.
- Removed the duplicate Media Browser side-menu item so users enter media management through Media Library and invoke browsing from contextual pickers.
- Aligned media storage under root `storage/public` and `storage/private`, linked frontend public storage to root public storage, and removed the stale server-local storage folder.
- Bumped the workspace to version `1.0.22` and recorded the media manager batch in the changelog.

## 2026-05-22

- Copied and wired tenant settings and sales settings into the active application.
- Added sales list, show, upsert, print template, print page, and print helpers.
- Expanded tenant database provisioning for company, contact, product, sales, and settings surfaces.
- Reworked common master data with reusable autocomplete lookup components and module-oriented common pages.
- Added location relationship seed data for countries, states, districts, cities, and pincodes.
- Added product-oriented common seed data for HSN codes, taxes, units, categories, types, groups, brands, colours, sizes, and styles.
- Reworked contact, company, and product frontend pages for cleaner list, show, and upsert flows.
- Added standalone product feature page routing and documented the rule that module pages must be feature-owned standalone pages.
