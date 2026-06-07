# PAYMENTENTRY

## Summary
Handles payment (outward money) entry creation and management for tenant businesses. Uses a flat module structure (no DDD sub-folders) with service, controller, repository, and types files. Tracks payments made to parties (suppliers) with allocation details, payment mode, and reference information.

## What We Done
- Payment entry CRUD with party-based tracking and payment mode (cash, bank, etc.)
- Multi-tenant data isolation via TenantContextService with 'company.manage' permission scope
- Auto-numbering via DocumentNumberRepository
- PDF generation via shared PrintHtmlPdfService
- Email delivery via shared EntryDocumentMailService
- Allocation tracking with linked reference entries
- Soft-delete support
- Comment and activity tracking
- TypeORM repository pattern with tenant-scoped queries
- Database migration for payment entry schema

## Gaps
- No payment confirmation / reconciliation flow against bank statements
- No cheque management (bounce tracking, clearance status)
- No payment approval workflow
- No integration with payment gateways (NEFT/RTGS/UPI automation)
- No vendor payment aging or due-date alerts
- No partial payment handling against a single invoice

## Future Concepts
- Bank statement import and auto-reconciliation
- Cheque printing and management with status tracking
- Multi-level payment approval workflows
- UPI/NEFT/RTGS payment file generation for bank upload
- Payment reminder and scheduling based on invoice due dates
- Payment batch processing for bulk vendor payments
