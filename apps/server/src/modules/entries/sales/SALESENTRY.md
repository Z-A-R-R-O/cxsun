# SALESENTRY

## Summary
Handles domestic sales invoice creation, management, and lifecycle for tenant businesses. Follows a DDD pattern with domain aggregates, application services, infrastructure repositories, and HTTP controllers. Supports multi-tenant isolation, auto-numbering via DocumentNumberRepository, PDF generation and email delivery through shared entry services.

## What We Done
- Sales invoice CRUD with full item details (rate, quantity, discount, tax, narration)
- Multi-tenant data isolation via TenantContextService with 'company.manage' permission scope
- Auto-numbering via DocumentNumberRepository across sales, purchase, payment, receipt and stock modules
- PDF generation via shared PrintHtmlPdfService using Playwright/Chromium
- Email delivery via shared EntryDocumentMailService with attachment support
- Event-driven lifecycle using event bus pattern with events (created, updated, deleted, archived)
- Master queue service integration for event publishing
- Nested CRUD for sales items, charges, and transaction allocations
- Soft-delete support with archived state
- Comment and activity tracking on sales entries
- TypeORM repository pattern with tenant-scoped queries
- Database migration for sales entry schema

## Gaps
- No e-invoice / e-waybill generation integration (separate gst-compliance module handles this)
- No partial invoicing or delivery-challan linking
- No credit note / debit note flow against sales invoices
- No bulk invoice generation or recurring invoice scheduling
- No payment tracking or outstanding balance computation within the module
- No export to accounting software (Tally, etc.) integration

## Future Concepts
- Link sales entries with stock delivery notes for inventory deduction
- E-invoice QR code and IRN generation via GSP provider
- Payment reconciliation with payment/receipt entry allocations
- Recurring invoice automation
- Sales return / credit note workflow
- Bulk PDF/email dispatch for periodic invoicing cycles
