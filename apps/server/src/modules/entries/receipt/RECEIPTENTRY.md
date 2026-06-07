# RECEIPTENTRY

## Summary
Handles receipt (inward money) entry creation and management for tenant businesses. Mirrors the payment entry structure with party-based tracking for money received from customers. Uses a flat module structure with service, controller, repository, and types files.

## What We Done
- Receipt entry CRUD with party-based tracking and receipt mode (cash, bank, etc.)
- Multi-tenant data isolation via TenantContextService with 'company.manage' permission scope
- Auto-numbering via DocumentNumberRepository
- PDF generation via shared PrintHtmlPdfService
- Email delivery via shared EntryDocumentMailService
- Allocation tracking with linked reference invoices
- Soft-delete support
- Comment and activity tracking
- TypeORM repository pattern with tenant-scoped queries
- Database migration for receipt entry schema

## Gaps
- No receipt confirmation against bank statement
- No cheque management (deposit tracking, clearance, bounce)
- No partial receipt allocation across multiple invoices
- No integration with payment gateways for online collections
- No customer aging or credit limit enforcement
- No receipt approval workflow
- No auto-suggestion for invoice allocation based on outstanding

## Future Concepts
- Bank statement import and auto-reconciliation for receipts
- Cheque deposit tracking with clearance status
- Online payment gateway integration (Razorpay, Stripe, etc.)
- Automated invoice-wise receipt allocation suggestions
- Customer credit limit monitoring and enforcement
- Receipt batch processing for bulk collections
