# DOCUMENTSETTINGS

## Summary
Manages document numbering and auto-numbering configuration for nine document types across entry and stock modules. Controls number prefix, suffix, starting number, and number pattern for each document type per tenant. Ensures unique sequential numbering for all generated business documents.

## What We Done
- Document number configuration for 9 document types (sales invoice, purchase invoice, payment, receipt, export sales, purchase receipt, delivery note, stock adjustment, and more)
- Auto-numbering sequence management with prefix, suffix, and starting number
- Multi-tenant data isolation via TenantContextService with 'company.manage' permission scope
- DocumentNumberRepository used across entries and stock modules for number generation
- TypeORM repository pattern for settings persistence
- Database migration for document-settings schema
- DDD-structured module with domain, application, infrastructure, and interface layers

## Gaps
- No document format template configuration (invoice layout, challan format, etc.)
- No fiscal year-based numbering reset
- No custom number pattern with date or department placeholders
- No document series management (multiple series per document type)
- No number format preview before saving
- No duplicate number detection or prevention on manual override
- No integration with document printing/mailing for format selection

## Future Concepts
- Fiscal year-based auto-reset of document numbering
- Custom number format with dynamic placeholders (FY, department, location code)
- Multiple document series per type with assignment rules
- Document format template configuration (layout, fields, logo)
- Number preview tool in settings UI
- Document watermark and security features
- Centralized document workflow configuration hub
