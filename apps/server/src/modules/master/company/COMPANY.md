# COMPANY

## Summary
Manages tenant company (business entity) profiles with complete address, contact, registration, and tax information. Uses a custom aggregate pattern (not the generic master-record pattern) with domain entities, application services, and infrastructure repositories. Serves as the root entity for multi-tenant data isolation.

## What We Done
- Company profile CRUD with business details, addresses, and contacts
- Tax registration management (GSTIN, PAN, TAN, CIN, MSME)
- Bank account details management for the company
- Company logo and branding image upload support
- Multi-tenant data isolation via TenantContextService
- Custom aggregate pattern with domain entity, value objects, and repository
- Database migration for company schema
- Company seeding on tenant creation/onboarding

## Gaps
- No company document management (registration certificates, etc.)
- No multi-branch/business-vertical support within a tenant
- No company fiscal year configuration
- No company-level preference or feature toggle settings
- No audit log for company profile changes
- No company deactivation/reactivation workflow

## Future Concepts
- Document repository for company registration and compliance documents
- Multi-branch management with per-branch settings and inventory
- Fiscal year configuration with opening/closing balance
- Company preference management (invoice format, tax defaults, etc.)
- Company profile change audit trail
- Bulk company import/export for enterprise onboarding
