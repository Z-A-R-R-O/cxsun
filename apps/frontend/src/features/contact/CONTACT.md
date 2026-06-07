# Contact

## Summary
Standalone contact master with full CRUD, multi-tab profile (identity, tax, communication, addresses, finance, social), and lookup-ready fields for use across other features.

## What We Done
- `contact-page.tsx` — Full CRUD list/show/upsert. List with column visibility, search (code, name, legal name, ledger, phone, email, GSTIN), status filter (all/active/suspend), pagination. Show view with sections: Contact profile (name, code, legal name, contact type, ledger, website, description, status), Compliance (GSTIN, PAN, TAN, MSME, TDS, TCS), Accounts (opening balance, credit limit, balance type), Addresses, Emails, Phones, Bank accounts, Social links, Timestamps. Upsert with tabs: Details (name with auto-legal-name, code, legal name, contact type autocomplete from master-data, opening balance, credit limit, active toggle), Tax Details (GSTIN, PAN, MSME No/Type, TAN, TDS/TCS toggles), Communication (emails, phones collections with type/poly toggle per row), Addresses (collection with type autocomplete, country/state/district/city/pincode cascade, default toggle), Finance (bank accounts with bank name autocomplete, account number, holder, IFSC, branch, primary toggle), More (website, description, social links collection). Validation banner for missing mandatory fields (name, contact type).
- `contact-client.ts` — `listContacts`, `upsertContact`, `destroyContact`, `restoreContact`, `emptyContact`, `emptyAddress`. CamelCase/snake_case normalization. Types: `ContactRecord`, `ContactInput`, `ContactAddress`, `ContactEmail`, `ContactPhone`, `ContactSocialLink`, `ContactBankAccount`, `ContactGstDetail`.

## Gaps
- GST details collection defined in types but not used in upsert form.
- No contact merge or bulk import/export.
- Contact ledger mapping is tied to contact type — no independent ledger selection.
- No contact group/category hierarchy.

## Future Concepts
- GST details form per contact (multi-state registration).
- Contact ledger wizard (auto-create sundry debtor/creditor ledgers).
- Contact statements and aging reports.
- Bulk contact import from CSV.
- Contact portal with self-service profile management.
