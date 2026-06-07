# EXPORTSALESENTRY

## Summary
Handles export (foreign) sales invoice creation, management, and lifecycle for tenant businesses engaged in international trade. Extends the domestic sales entry pattern with currency support. Follows DDD with domain aggregates, application services, infrastructure repositories, and HTTP controllers.

## What We Done
- Export sales invoice CRUD with item details and foreign currency support (currency code, exchange rate)
- Multi-tenant data isolation via TenantContextService with 'company.manage' permission scope
- Auto-numbering via DocumentNumberRepository
- PDF generation via shared PrintHtmlPdfService
- Email delivery via shared EntryDocumentMailService
- Event-driven lifecycle with events (created, updated, deleted, archived)
- Master queue service integration for event publishing
- Nested CRUD for invoice items, charges, and allocations
- Soft-delete support with archived state
- Comment and activity tracking
- TypeORM repository pattern with tenant-scoped queries
- Database migration for export sales schema

## Gaps
- No duty drawback or export incentive tracking
- No IEC (Importer Exporter Code) validation
- No integration with customs or export documentation systems
- No foreign currency gain/loss computation
- No support for letter of credit (LC) workflows
- No e-commerce export or courier shipment integration

## Future Concepts
- Integration with customs e-filing systems for shipping bills
- Export incentive scheme management (MEIS, RoDTEP, etc.)
- Real-time exchange rate feeds for invoice pricing
- LC tracking and document submission workflow
- Export order linkage with domestic purchase for bond execution
