# CONTACT

## Summary
Manages customer and supplier master data for tenant businesses. Uses the generic master-record CRUD pattern from foundation/master-record for standardised list management. Supports contact groups, addresses, communication details, and tax registration information.

## What We Done
- Contact CRUD (customers and suppliers) using master-record pattern
- MasterRecordRepository-based generic list management with type field differentiation
- Multi-tenant data isolation via TenantContextService
- Contact grouping and categorization
- Address management with type (billing, shipping, registered)
- Contact person management with communication details
- Tax registration fields (GSTIN, PAN) on contact records
- Credit limit and payment term configuration
- Database migration for contact schema

## Gaps
- No contact merge/deduplication logic
- No contact import from CSV or other sources
- No communication history tracking (calls, emails, meetings)
- No contact activity score or engagement tracking
- No vendor/customer portal access management
- No contact-specific pricing or discount rules

## Future Concepts
- Contact deduplication with merge workflow
- Bulk contact import/export with validation
- CRM-style communication history and engagement tracking
- Contact segmentation and grouping for marketing
- Customer portal access with self-service profile management
- Contact-specific pricing tiers and discount schedules
