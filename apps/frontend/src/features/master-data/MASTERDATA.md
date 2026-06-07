# Master Data

## Summary
DDD-structured master data engine handling "common" (shared reference tables: countries, states, cities, etc.) and "master" (tenant-owned: contacts, products, orders) modules. Dynamic column-driven CRUD with autocomplete lookups.

## What We Done
- `domain/master-data.ts` — Core types: `MasterDataKind`, `MasterDataColumnType`, `MasterDataColumnDefinition`, `MasterDataModuleDefinition`, `MasterDataRecord`, `MasterDataUpsertInput`.
- `application/master-data-service.ts` — `pageModuleMap` (78 route→moduleKey mappings across billing, inventory, ecommerce, CRM, auditor apps). `pageModuleKey`, `pageModuleKind`, `buildDraft`, `validateDraft`, `isActive`, `formatValue`, `formatDate`, `searchRecords`.
- `infrastructure/master-data-client.ts` — `listMasterDataModules` (supports `kind` filter, standalone definitions for contacts/products/orders), `listMasterDataRecords`, `upsertMasterDataRecord` (POST to `/upsert`), `destroyMasterDataRecord`, `restoreMasterDataRecord`. Routes: `/api/v1/common/{key}`, `/api/v1/{contacts|products|orders}`.
- `interface/pages/master-data-page.tsx` — `MasterDataPage` (list, show, upsert views for master modules). List with UUID, dynamic columns, status badge, pagination. Show with details + timestamps table. Upsert with `AnimatedTabs` (Details tab with dynamic editor fields + active toggle).
- `interface/pages/common-data-page.tsx` — `CommonModulePage` (list and upsert dialog for common modules). Reference-linked autocomplete for geo hierarchy (country → state → district → city → pincode). Cascading `optionFilter` based on parent ID.
- `interface/pages/common-module-pages.tsx` — Registry of 28 page components (`commonPageRegistry`) routing module keys to `CommonModulePage`.
- `interface/components/common-record-autocomplete-lookup.tsx` — Reusable combobox with search, keyboard navigation, portal dropdown, and inline record creation via `createInput`. Portal-based positioning with scroll/resize tracking.
- `interface/components/country-autocomplete-lookup.tsx` — Wraps `CommonRecordAutocompleteLookup` for countries, auto-generates unique code from name.
- `interface/components/state-autocomplete-lookup.tsx` — Filters by `country_id`, auto-generates unique short code.
- `interface/components/district-autocomplete-lookup.tsx` — Filters by `state_id`.
- `interface/components/city-autocomplete-lookup.tsx` — Filters by `district_id` and `state_id`.
- `interface/components/pincode-autocomplete-lookup.tsx` — Filters by `city_id`.
- `interface/components/product-autocomplete.tsx` — Dedicated product combobox with `ProductCreateDialog` (name, code, product type, HSN code, unit, GST %, active switch). Returns `ProductCommonLookup` with tax rate, unit, HSN code.
- `interface/components/work-order-autocomplete.tsx` — Dedicated work order (orders) combobox with `WorkOrderCreateDialog` (name, code, description).

## Gaps
- No import/export (CSV/Excel) for bulk master data operations.
- No audit log for master data changes.
- No soft-delete filter toggle (suspended records always shown with muted styling).
- `AccountingYear` has special `is_current_year` badge but no year-advancement workflow.

## Future Concepts
- Dynamic form builder rendered from `MasterDataColumnDefinition` (already partially done with `EditorField`).
- Master data import wizard with column mapping.
- Data validation rules engine (unique constraints, regex patterns) defined per module.
- Cross-tenant master data sync for super-admin.
