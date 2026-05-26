# Live Client Scope

Updated: 2026-05-26

This is the first real client map for CXSun. Each row is a tenant scope unless noted. Tenant databases can hold multiple companies, so Sathasivam stays one tenant with Sukraa Garments and Mathan Knitters as companies.

For clean cloud installation, `db:seed` creates only CODEXSUN Shared Billing and Aaran Associates. All other planned clients stay in this reference list and should be created manually through Super Admin when each tenant is ready to onboard.

## Domain Strategy

- Local development uses exact host-file mappings to `127.0.0.1`, including `.local` tenant aliases.
- Every public client entry must resolve to one active tenant domain. No shared public fallback is allowed.
- `codexsun.com` is itself a tenant domain for the CODEXSUN billing tenant, not a fallback for other clients.
- Client production can use either subdomains such as `sukraa.codexsun.com` or client-owned domains through the same `tenant_domains` table.
- Nginx should route `*.codexsun.com` and client-owned domains to the same frontend/backend deployment; the app resolves the tenant by domain and fails closed when no mapping exists.
- Tenant capabilities come from app options, industry settings, and customization metadata stored on the tenant scope.

## Local Helper

Run from Administrator PowerShell:

```powershell
npm run hosts:local
```

Check missing host mappings without editing:

```powershell
npm run hosts:check
```

## Tenant Scopes

| Code | Tenant | Domains | Industry | Apps / Scope |
|---:|---|---|---|---|
| 100 | Aaran Associates | `aaran.codexsun.com`, `office.codexsun.com`, `aaran.local` | Auditor office / software back office | Auditor, task manager, CRM, billing |
| 101 | CODEXSUN Shared Billing | `codexsun.com`, `www.codexsun.com`, `codexsun.local` | Shared billing platform | Billing for shared-domain clients |
| 102 | Sri Ganapathi Printing Press | `sriganapathi.codexsun.com`, `ganapathi.local` | Offset printing | Simple billing + accounts |
| 103 | Cotton Knits Fashion | `cotton.codexsun.com`, `cottonknits.codexsun.com`, `cotton.local` | Garment manufacturing | Billing + accounts + e-invoice + e-way |
| 104 | Sathasivam Garment Group | `sukraa.codexsun.com`, `mathan.codexsun.com`, `sukraa.local` | Garment manufacturing | Sukraa Garments + Mathan Knitters |
| 105 | Poly Made India | `polymade.codexsun.com` | Fabric trading | Billing + accounts + e-invoice + e-way |
| 106 | Amal Tex | `amaltex.codexsun.com`, `amaltex.local` | Garment manufacturing | Billing + accounts + e-invoice + e-way |
| 107 | KGS Printing | `kgsprinting.codexsun.com` | Offset printing | Simple billing + accounts |
| 108 | Thirumurugan Printers | `thirumurugan.codexsun.com` | Offset printing | Simple billing + accounts |
| 109 | SMS UPVC | `smsupvc.codexsun.com`, `smsupvc.local` | UPVC | Simple billing + accounts + e-way |
| 110 | Tirupur Direct | `tirupurdirect.codexsun.com`, `tirupurdirect.local` | Ecommerce / garments sales | Ecommerce + billing + inventory |
| 111 | Deal O Deal | `dealodeal.codexsun.com` | Ecommerce / computer seconds store | Ecommerce + billing + inventory |
| 112 | Tenkasi Sports | `tenkasisports.codexsun.com`, `tenkasisports.local` | Sports club | Students, masters, subscriptions, attendance |
| 113 | Altexlabs | `altexlabs.codexsun.com` | Garment testing lab | Testing reports and lab workflow |
| 114 | Aaran Business Connect | `business.codexsun.com`, `connect.codexsun.com`, `aaranconnect.local` | Business connect | Business directory and lead connection |

## Implementation Notes

- The first-install seed catalog is stored in `apps/server/src/core/tenant/live-client-scope.ts`.
- `db:seed` upserts tenant rows, tenant app settings, domain mappings, industry records, and scoped company seed names only for CODEXSUN and Aaran Associates.
- Public pages resolve strictly through `GET /api/site/tenant-static`; an unmapped domain returns an unresolved tenant error.
- Private tenant data must still use authenticated tenant APIs.
