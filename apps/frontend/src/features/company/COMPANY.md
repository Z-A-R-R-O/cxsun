# Company

## Summary
Company CRUD with rich profile (identity, comms, logos, tax, bank accounts, addresses, notes), default company context picker, letterhead builder for print documents, and logo URL resolution.

## What We Done
- `company-page.tsx` — Full CRUD list/show/upsert. List with search (name, code, email, phone, tenant, industry), status filter (all/active/suspended), column visibility toggle, pagination, inline status toggle. Show view with sections: Company profile (name, code, legal name, tagline, website, email, phone, incorporated date, status), Tenant & Industry (super-admin only), Compliance (GSTIN/PAN/TAN/MSME/TDS/TCS), Addresses, Bank accounts, Emails, Phones, Social links. Upsert with tabs: Details (name, legal name, code, tenant, industry, tagline, primary/active toggles), Communication (emails, phones, social links collections + website), Logos (logo/logo-dark/favicon via MediaPickerDialog), Tax Details (GSTIN, PAN, MSME, DOI, TDS/TCS), Accounts (bank accounts with bank name autocomplete, account number, holder, IFSC, branch, QR image, primary toggle), Addressing (address collection with type autocomplete, country/state/district/city/pincode cascade, default/active toggles), Notes (short about, description).
- `company-client.ts` — `listCompanies`, `getCompany`, `upsertCompany`, `destroyCompany`, `restoreCompany`, `getDefaultCompanyContext`, `updateDefaultCompanyContext`, `emptyCompany`, `toCompanyInput`. Address label enrichment via master-data records. Types: `CompanyRecord`, `CompanyUpsertInput`, `CompanyAddress`, `CompanyEmail`, `CompanyPhone`, `CompanySocialLink`, `CompanyBankAccount`, `CompanyLogo`, `DefaultCompanyContext`.
- `company-logo.ts` — `companyLogoUrl` / `companyLogoSet` helpers with tenant storage URL resolution, cache-busting via `?v=logoId`, fallback to bundled SVGs.
- `default-company-page.tsx` — Read/edit view for the tenant's default company context (company + accounting year + landing app). No-create autocomplete lookup for each field with portal-based dropdown position calculation.
- `letterhead-builder.tsx` — Print letterhead component rendering company name, address, contact, GSTIN/MSME, and logo with configurable `LetterheadSettings` (fonts, sizes, colors, positions). `companyLetterheadLines` extracts address/contact/tax lines. `normalizeLetterheadSettings` clamps values to bounds.

## Gaps
- No company settings/features configuration in UI (settings/features in form data are hardcoded defaults).
- Letterhead builder is a presentational component only — no live preview editor for settings.
- No company merge or bulk operations.
- Address labels enrichment pre-fetches all master-data records each load — no caching strategy.

## Future Concepts
- Company settings editor (timezone, currency, feature toggles).
- Letterhead designer with drag-and-drop logo/text positioning.
- Bulk company import/export.
- Company hierarchy (parent/subsidiary).
