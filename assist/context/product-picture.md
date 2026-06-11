# CXSun Product Picture

This document is the clear product picture for CXSun. It describes what we are building and how future implementation should fit together.

## Product North Star

CXSun is a multi-tenant commerce and business operating platform. Each tenant gets an isolated workspace to run storefront, sales, inventory, finance, company, and day-to-day operations from one system. The platform team gets separate tools to operate the software, support users, manage tenants, and keep the system healthy.

The product should feel like one connected operating layer:

```text
Public site and storefront
  -> customer and order activity
  -> tenant workspace
  -> company, catalog, stock, finance, support, and reporting
  -> Versatile Agent for knowledge, actions, workflows, planning, and analytics
  -> platform admin and super-admin control
```

## Primary Surfaces

### Public Site

The public site introduces the platform and tenant/storefront content. It should support:

- Landing pages such as home, about, services, contact, and blog.
- Tenant or brand-aware public pages through domain resolution.
- Future storefront pages for catalog, product detail, cart, checkout, order tracking, and customer account access.

### Tenant Workspace

The tenant workspace is the client-side operating system for a business. It is isolated by tenant database and reached under `/app/*`.

It should support:

- Company setup and default company selection.
- Tenant-local roles and permissions.
- Industry-aware configuration and feature availability.
- Products, services, catalog, pricing, and tax setup.
- Customers, suppliers, leads, and contacts.
- Sales orders, purchases, stock movement, invoices, receipts, payments, and reports.
- Separate domestic and export invoicing, with export currency selection and company-controlled feature availability.
- Storefront settings, channels, order fulfillment, and customer communication.

Tenant users must only see their own tenant data. Tenant company and role data belongs in the tenant database.

### Admin Software Desk

The admin desk is for people operating the software product itself. It is reached under `/admin/*`.

It should support:

- Helpdesk and support tickets.
- Bug intake, triage, reproduction notes, and release follow-up.
- Client notes and implementation follow-up.
- System update visibility and operational maintenance.
- Support workflows that help clients without mixing into tenant-owned business data unless explicitly authorized.

Admin users are software operators, not tenant business users.

### Super-Admin Orchestration

The super-admin surface is the platform command center. It is reached under `/sa/*`.

It should support:

- Tenant creation, suspension, restore, and database binding.
- Tenant domain master list, show page, upsert page, and domain-based resolution.
- Platform master data such as industries and feature catalogs.
- Cross-tenant diagnostics, company counts, provisioning health, and system update control.
- Platform users, roles, global policy catalogs, and tenant policy toggles.
- Safe inspection tools that do not accidentally break tenant isolation.

Super-admin should orchestrate the platform, not become the default path for tenant day-to-day work.

In the super-admin UI, keep navigation split into two easy areas:

- `Platform / Master Database`: tenant, domain, industry, system update, and admin user manager.
- `Tenant Database`: tenant-owned modules such as company that resolve into tenant database context.

### Versatile Agent OS

The agent layer should sit above the existing platform, not replace the existing module boundaries.

It should be built in layers:

- Helper Agent for platform knowledge and FAQ-style guidance.
- Operator Agent for safe CRUD through typed backend tools.
- Workflow Agent for multi-step action chains.
- Planner Agent for goals, roadmaps, milestones, and tasks.
- Analytics Agent for reading and explaining data.
- Agent Router for choosing and chaining specialized agents.
- Shared Memory for user preferences, projects, tasks, history, and useful summaries.

The first implementation should be read-only Helper Agent with RAG over trusted docs and site knowledge. Do not add automation until typed tools, confirmation rules, and `agent_logs`/`tool_executions` exist.

## Data Model Picture

CXSun uses a two-layer data model:

```text
Master MariaDB
  site content
  tenants
  tenant domains
  industries
  platform users
  user-tenant access
  global policy catalog
  admin/support/client notes
  queues and operational state

Tenant MariaDB database
  companies
  company child tables
  accounting years
  default company
  tenant-local roles
  tenant-local policy assignments
  future commerce and ERP records
```

The request flow for tenant-owned data is:

```text
URL host/domain or selected tenant
  -> platform tenant_domains
  -> platform tenants
  -> JWT and user_tenants access
  -> TenantContextService
  -> tenant database
  -> tenant-local module
```

## Module Roadmap

### Platform Modules

Platform modules live in the server app and use the master MariaDB database unless they explicitly enter tenant context.

- `site`: public content and contact messages.
- `tenant-domain`: domain-to-tenant mapping.
- `tenant`: tenant records, lifecycle, database configuration, and diagnostics.
- `auth`: users, login, JWT, and user-to-tenant access.
- `industry`: platform master industries and default feature templates.
- `client`: admin-side client notes and support memory.
- `queue`: operational jobs and background work.
- Future `support`: helpdesk tickets, bug reports, status, and release follow-up.
- Future `catalog-master`: shared definitions for product, tax, units, and feature templates.

### Tenant Modules

Tenant modules must resolve through `TenantContextService` and use the tenant database.

- `company`: company identity, addresses, contacts, bank accounts, logos, settings, and features.
- Future `tenant-rbac`: tenant-local roles and role-policy assignments.
- Future `catalog`: tenant products, services, categories, brands, units, and prices.
- Future `inventory`: locations, stock, transfers, adjustments, and batches.
- `sales`: domestic invoices, export invoices, receipts, returns, customer balances, GST compliance, print, and queued PDF email delivery.
- Future `purchase`: suppliers, purchase orders, bills, payments, and returns.
- Future `storefront`: theme, navigation, product publication, cart, checkout, shipping, and order tracking.
- Future `finance`: ledgers, taxes, accounting periods, journal entries, and reports.
- Future `crm`: customers, leads, campaigns, and communication history.

## Route Picture

Frontend route families should stay explicit:

- `/`: public site.
- `/login`: tenant/client login.
- `/app/*`: tenant/client workspace.
- `/admin/login`: admin software desk login.
- `/admin/*`: admin software desk.
- `/sg/login`: super-admin login.
- `/sa/login`: accepted super-admin login alias.
- `/sa/*`: super-admin orchestration.

Important examples:

- `/app/company`: tenant-local company management.
- `/admin/company`: admin/helpdesk company support desk.
- `/sa/company`: super-admin company surface.
- `/sa/tenant-domain`: super-admin tenant-domain mapping surface.

Each route family has its own auth gate and browser session key.

## Implementation Principles

- Keep tenant business data isolated in tenant databases.
- Keep platform orchestration data in the master MariaDB database.
- Do not let tenant login unlock admin or super-admin surfaces.
- Do not let hidden menu filtering be the only security boundary; route guards and server checks must also enforce access.
- Generate public record UUIDs through the shared alphanumeric public UUID helper.
- Treat super-admin, admin, and tenant dashboards as separate products that share UI foundations, not as one mixed dashboard.
- Add new features first to the correct surface, then wire shared UI only where it does not blur ownership.
- Prefer simple, explicit module boundaries over clever cross-module imports.

## Immediate Product Direction

The next implementation direction should build from the current foundation in this order:

1. Versatile Helper Agent for platform knowledge, docs, FAQ, architecture, and feature explanation.
2. Tenant-local roles and permissions UI.
3. Company default selection and company context switching inside the tenant workspace.
4. Admin helpdesk and bug desk backed by the master MariaDB database.
5. Tenant catalog and product/service setup.
6. Storefront/public catalog pages through domain resolution.
7. Sales/order/invoice flow inside the tenant database.
8. Inventory and finance modules inside tenant databases.
9. Super-admin diagnostics for tenant database health, feature toggles, and provisioning.
10. Operator and Workflow Agent layers after safe tool contracts are implemented.
