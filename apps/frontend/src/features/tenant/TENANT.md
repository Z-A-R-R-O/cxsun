# TENANT

## Summary
Tenant management module for SaaS multi-tenancy — superadmin can view, create, edit, and manage tenant companies with plan/subscription oversight.

## What We Done
- Tenant list page (MasterListPageFrame with search, action buttons)
- Tenant creation dialog with company details and plan selection
- Tenant edit/show dialog with subscription status
- Tenant suspend/unsuspend toggle
- Navigation via nested route under superadmin

### Application
- (application-level tenant logic — pending deeper read)

### Domain
- Domain management linked to tenants

### Infrastructure
- (infrastructure-level tenant services — pending deeper read)

### Interface
- Tenant interface definitions and types

## Gaps
- No subscription/billing management UI (plan changes, invoices, payment history)
- No tenant provisioning status indicator
- No tenant usage/analytics dashboard (storage, users, transactions)
- No tenant data export/deletion (GDPR)
- No trial period management
- No tenant feature flag override
- No tenant backup/restore at tenant level

## Future Concepts
- Subscription & billing management with plan upgrades/downgrades
- Tenant usage dashboard (API calls, storage, active users)
- Tenant self-service portal for admins
- Tenant data export/import tools
- Trial-to-paid conversion workflow
- Tenant feature flag management per subscription tier
- Automated tenant provisioning pipeline
- Tenant activity/audit log
