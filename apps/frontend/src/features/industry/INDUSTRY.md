# Industry

## Summary
Master industry records with payload schema, default feature flags, and UI settings. Separate page for assigning industry to companies across tenants.

## What We Done
- `industry-page.tsx` — Full CRUD list/show/upsert. List with column visibility, search, status filter, pagination. Show view with profile (name, code, status, features), payload schema (JSON), UI settings (JSON), timestamps. Upsert with tabs: Details (code, name, active toggle), Payload (schema JSON textarea), Defaults (features comma-separated, UI settings JSON textarea). All JSON fields validated on save.
- `company-industry-page.tsx` — Super-admin tool to assign an industry to a company across any tenant. Three-way cascading autocomplete (tenant → company → industry). Summary bar showing current selections. Updates the company via `upsertCompany` with `industryId`. Company table shows current industry per company with edit button.
- `industry-client.ts` — `listIndustries`, `upsertIndustry`, `destroyIndustry`, `restoreIndustry`, `emptyIndustry`, `toIndustryInput`. Types: `IndustryRecord`, `IndustryUpsertInput`.

## Gaps
- Payload schema and UI settings are free-form JSON with no schema validation or form builder.
- No industry-based feature flag inheritance visualization.

## Future Concepts
- Schema-driven form builder for industry payload and UI settings.
- Industry comparison view (diff schema/settings across industries).
- Industry-based default company creation template.
