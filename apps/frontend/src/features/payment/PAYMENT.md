# Payment

## Summary
Outgoing supplier payment management with full CRUD, document-based allocation, print-ready payment voucher, comments, and entry tools (email, assign, attachments, tags, WhatsApp).

## What We Done
- `payment-client.ts` — `listPaymentEntries`, `getPaymentEntry`, `upsertPaymentEntry` (POST `/upsert`, returns `document_number_warning`), `destroyPaymentEntry`, `restorePaymentEntry`, `addPaymentComment`, `runPaymentTool`, `listPaymentContactLookups`. Types: `PaymentEntry`, `PaymentEntryInput`, `PaymentAllocation`, `PaymentLookupOption`. Helpers: `emptyPaymentEntry`, `emptyPaymentAllocation`.
- `payment-page.tsx` — Three-view state machine (list/show/upsert). List with column visibility (payment, date, supplier, mode, ledger, status, amount, unallocated, updated), search, status filter (draft/posted/cancelled), pagination.
  - **Show view** — `PaymentShowPage`: Full-screen layout with print button, prev/next navigation, `PaymentPrintDocument` (letterhead, payment voucher grid with amount-in-words using Indian numbering, supplier/bank details, allocation summary, receiver sign / authorised signatory). Comments section with timeline. Activity feed with visual timeline. Entry tools sidebar: email (queues PDF via `capturePrintDocument`), assign, attachments, tags, WhatsApp.
  - **Upsert view** — `PaymentUpsertPage`: Two-tab form (Details + Allocations). Supplier autocomplete with inline contact creation (`PaymentContactCreateDialog`). Payment mode (cash/RTGS/NEFT/UPI) with conditional bank account selector. Work order autocomplete. Auto-generated payment number via `nextDocumentNumberSetting`. Allocations tab with dynamic allocation rows (document number, date, balance, allocated amount). Save & Print button (`status: "posted"`).
  - **List view** — Standard `MasterListPageFrame` with `MasterList*` components.
- **Print document** — `PaymentPrintDocument` with `LetterheadBuilder`, `numberToIndianCurrencyWords` (Crore/Lakh/Thousand Indian numbering), money voucher table, jurisdiction note.
- **Utilities** — `Field` (with numeric mode, focus/blur decimal formatting), `sanitizeDecimalInput`, `parseDecimalInput`, `formatMoney` (INR currency), `numberToWords`, `maskAccountNumber`.

## Gaps
- No purchase order / invoice document reference in allocations (only `document_no` text field).
- No `unallocated_amount` auto-calculation in the form.
- Entry tools (assign, attachments, tags) only store local state (not persisted via API).
- No PDF preview before print.
- No payment receipt generation for the supplier.

## Future Concepts
- Linked purchase invoice selector in allocations (auto-fill balance).
- Auto-allocation based on outstanding invoices.
- Payment approval workflow (draft → submitted → approved → posted).
- Bulk payment processing (multi-supplier).
- UPI / payment gateway integration with payment link generation.
