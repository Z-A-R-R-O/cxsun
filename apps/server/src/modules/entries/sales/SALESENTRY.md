# SALESENTRY

## Summary
Handles domestic sales invoice creation, management, and lifecycle for tenant businesses. Follows a DDD pattern with domain aggregates, application services, infrastructure repositories, and HTTP controllers. Supports multi-tenant isolation, auto-numbering via DocumentNumberRepository, compliance fields for E-invoice/E-way results, PDF generation, and email delivery through shared entry services.

## What We Done
- Sales invoice CRUD with full item details (rate, quantity, discount, tax, narration)
- Multi-tenant data isolation via TenantContextService with `company.manage` permission scope
- Auto-numbering via DocumentNumberRepository across sales, purchase, payment, receipt, and stock modules
- PDF generation via shared PrintHtmlPdfService using Playwright/Chromium
- Email delivery via shared EntryDocumentMailService with attachment support
- Event-driven lifecycle using event bus pattern with events (created, updated, deleted, restored, commented, tool)
- Master queue service integration for event publishing
- Nested CRUD for sales items, charges, and transaction allocations
- Soft-delete support with archived state
- Comment and activity tracking on sales entries
- Tenant-scoped repository pattern with sales entry persistence and total recalculation
- Database migration for sales entry schema
- Stored E-invoice/E-way compliance fields including IRN, acknowledgement number/date, signed QR, E-way bill number/date, transport details, and E-way part
- Sales E-invoice and E-way generation are enabled through the GST compliance module using the WhiteBooks GSP provider
- WhiteBooks responses are saved back onto the sales entry so show, print, PDF, and email output use the persisted compliance data

## Gaps
- No partial invoicing or delivery-challan linking
- No credit note / debit note flow against sales invoices
- No bulk invoice generation or recurring invoice scheduling
- No payment tracking or outstanding balance computation within the module
- No export to accounting software (Tally, etc.) integration from this module
- No bulk E-invoice/E-way processing endpoint for multiple sales entries
- No E-way cancellation, extension, or validity reminder workflow in the sales module

## Future Concepts
- Link sales entries with stock delivery notes for inventory deduction
- Bulk E-invoice and E-way processing through the WhiteBooks-backed GST compliance module
- Payment reconciliation with payment/receipt entry allocations
- Recurring invoice automation
- Sales return / credit note workflow
- Bulk PDF/email dispatch for periodic invoicing cycles
- E-way validity tracking, cancellation, and extension support
