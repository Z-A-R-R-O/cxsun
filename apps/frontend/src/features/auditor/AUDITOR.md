# Auditor

## Summary
Auditor workspace split into three sub-features: client register, contact credential management, and GST filing tracking.

## What We Done
- `client/auditor-client-page.tsx` — Full CRUD for auditor clients. List with search (ID, name, GSTIN, mobile, group), active/suspended filter, pagination. Show view with tabs (Client, Contact, Address, Credentials) and quick-client picker via popover. Upsert view with tabs for client details (name, group, GSTIN, active toggle), contact (person, mobile, WhatsApp, email), address (line1/2, state/city/pincode autocomplete from master-data), and credentials (6 service rows: GST, E-Invoice, E-Way, E-Invoice API, E-Way API, Email Account — each with user/account and password/secret). Inline credential editing in show table with copy-to-clipboard. Suspend/restore.
- `client/auditor-client-client.ts` — `listAuditorClients`, `upsertAuditorClient`, `suspendAuditorClient`, `restoreAuditorClient` with camelCase/snake_case normalization. Types: `AuditorClientRecord`, `AuditorClientInput`.
- `contact-detail/auditor-contact-detail-page.tsx` — Contact-bound credential and GST filing management. Contact picker popover. Tabs: Credentials (table of 6 service rows per contact, editable via dialog with user/pass fields, copy-to-clipboard), GST Filing (list of filing rows per contact, add/edit/delete with dialog — month/year autocomplete from master-data, GSTR-1 ARN/date, GSTR-3B ARN/date, finished/pending toggle).
- `contact-detail/auditor-contact-credential-client.ts` — `listAuditorContactCredentials`, `upsertAuditorContactCredential`, `emptyCredential`. Types: `AuditorContactCredentialRecord`, `AuditorContactCredentialInput`, `CredentialServiceKey`.
- `gst-filing/auditor-gst-filing-page.tsx` — Period-based GST filing grid. Month/year selector (autocomplete from master-data). Matrix table: one row per active contact, columns for GSTR-1 (ARN + date), GSTR-3B (ARN + date), status. Inline add/edit via dialog, delete support. Builds rows for all contacts even when no filing exists (isExisting flag).
- `gst-filing/auditor-gst-filing-client.ts` — `listAuditorGstFilings` (with contact/month/year filters), `upsertAuditorGstFiling`, `deleteAuditorGstFiling`. Types: `AuditorGstFilingRecord`, `AuditorGstFilingInput`.

## Gaps
- No dashboard/overview of filing compliance across clients.
- Credentials are stored in plaintext fields — no encryption or masking beyond password input type.
- No bulk filing entry or import from GST portal.
- No due-date alerts or reminder workflows.

## Future Concepts
- Filing compliance dashboard with color-coded status per period.
- Auto-reminders and notifications for upcoming/past-due filings.
- Bulk ARN import from GST portal CSV.
- Client grouping and reporting by group.
- Credential vault with encryption and access audit log.
