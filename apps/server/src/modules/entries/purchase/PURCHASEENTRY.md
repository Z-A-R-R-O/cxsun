# PURCHASEENTRY

## Summary
Handles purchase (supplier) invoice creation, management, and lifecycle for tenant businesses. Follows DDD with domain aggregates, application services, infrastructure repositories, and HTTP controllers. Mirrors the sales entry pattern but from the procurement perspective with supplier information tracking.

## What We Done
- Purchase invoice CRUD with item details (rate, quantity, discount, tax, narration)
- Multi-tenant data isolation via TenantContextService with 'company.manage' permission scope
- Auto-numbering via DocumentNumberRepository
- PDF generation via shared PrintHtmlPdfService
- Email delivery via shared EntryDocumentMailService
- Event-driven lifecycle with events (created, updated, deleted, archived)
- Master queue service integration for event publishing
- Nested CRUD for purchase items, charges, and allocations
- Soft-delete support with archived state
- Comment and activity tracking
- TypeORM repository pattern with tenant-scoped queries
- Supplier information and narration fields
- Database migration for purchase entry schema

## Gaps
- No purchase order (PO) matching or three-way matching (invoice vs receipt vs PO)
- No landed cost distribution across purchase items
- No reverse charge mechanism (RCM) for GST on purchases from unregistered dealers
- No integration with procurement or inventory reorder systems
- No vendor payment scheduling or aging analysis

## Future Concepts
- Purchase order creation and invoice matching workflow
- Landed cost allocation (freight, insurance, customs) across line items
- RCM GST computation and reporting
- Vendor portal for invoice submission and status tracking
- Automated payment scheduling based on invoice due dates
