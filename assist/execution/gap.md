# Entry And Accounting Flow Gap Analysis

Updated: 2026-06-13

## Scope Reviewed

This review focused on the live entry-to-accounting path:

- Entries: sales, purchase, receipt, payment.
- Books: cash book, bank book, day book, accounting vouchers.
- Accounting engine: chart of accounts, source posting, rollups, trial balance, profit and loss, balance sheet.
- Controls: period locks, posted-entry mutation rules, correction/reversal flow.
- Allocations: receipt open-invoice picker and payment open-bill picker.
- Compliance overlap: GST/e-invoice/e-way status and audit requirements where they affect posted documents.

## Current Working State

1. Source posting exists for the main accounting flow.

- Sales, purchase, receipt, payment, cash book, and bank book can create accounting vouchers and ledger postings.
- Day book and reports read from posted accounting vouchers/postings instead of only from source entry tables.
- Posting rollups exist for faster dashboard/report totals.
- Rebuild/repost endpoints exist for accounting posting recovery.

2. Ledger mapping is practical for users.

- Sales and purchase ledgers are dynamic through common type modules.
- Receipt and payment money side can resolve cash or bank ledgers.
- Cash book and bank book use selected cash/bank ledgers plus opposite ledgers for double-entry posting.
- Frontend naming is closer to client language: customer, supplier, sales ledger, purchase ledger.

3. Posted document control has started.

- Period lock tables exist and are migrated with the accounts module.
- Accounts API can list, create, and release period locks.
- Accounts UI can create, release, and inspect period locks from the Period Locks page.
- GST filing completion creates an idempotent monthly lock for the selected/default company and accounting year.
- Sales, purchase, receipt, and payment check period locks before create/update/delete/restore paths.
- Posted entries are blocked from direct update/suspend/restore and must use correction/reversal flow.
- Correction and reversal endpoints exist for sales, purchase, receipt, and payment.
- Correction/reversal audit rows are stored in `entry_correction_audit`.

4. Receipt/payment allocations are no longer only free text.

- Receipt allocation rows can pick an open posted sales invoice through autocomplete.
- Payment allocation rows can pick an open posted purchase bill through autocomplete.
- Allocation rows persist linked `document_id` plus document number/date/total/balance.
- Backend now validates linked receipt/payment allocations against the real posted invoice/bill and blocks over-allocation against other posted allocations.

5. Compliance hardening has begun.

- Gateway request/response/status/error/retry fields are available.
- Cancel e-invoice and cancel e-way flows exist.
- Signed QR payload is used for QR generation.
- Compliance action audit logging exists.

## Real Remaining Gaps

### 1. Allocation Posting Does Not Yet Settle Invoice/Bill Balances

Current state:

- Receipt/payment allocations are validated and linked.
- Sales/purchase `paid_amount`, `balance_amount`, and `payment_status` are still mostly source-entry fields.
- Allocation totals do not yet automatically update the linked sales invoice or purchase bill payment status.

Gap:

- Add a backend allocation settlement service that recalculates paid/balance/status for linked invoices and bills whenever receipt/payment allocations are created, edited, reversed, or reposted.
- Store allocation settlement audit so invoice/bill balance changes can be traced back to receipt/payment rows.

Priority: High.

### 2. Correction/Reversal Flow Needs Stronger Business Semantics

Current state:

- Correction creates a draft copy.
- Reversal creates a posted negative document.
- Direct posted mutation is blocked.

Gap:

- Add explicit source links on the correction/reversal documents themselves, not only in audit rows.
- Prevent multiple active reversals for the same original unless intentionally allowed.
- Define whether a correction draft should copy allocations or start clean.
- Add UI labels/history that clearly show "Corrects invoice X" or "Reverses receipt Y".
- Add approval/permission rules for reversal and correction creation.

Priority: High.

### 3. Period Locks Need Wider Accounting Coverage

Current state:

- Backend period lock API and Accounts UI exist.
- GST filing completion creates monthly GST period locks automatically.
- Sales, purchase, receipt, and payment save paths enforce active locks.

Gap:

- Enforce locks in manual accounting voucher create/post/cancel flows.
- Add super-admin visibility for locks across tenants if platform-level audit review needs it.
- Connect any future audit completion flow to the same period-lock service.
- Add direct lock links in blocked save errors once the UI has route-aware toast actions.

Priority: High.

### 4. Accounting Voucher Controls Need Period-Lock Enforcement

Current state:

- Source entries enforce period locks.
- Accounting vouchers block direct edit once posted.

Gap:

- Journal, contra, opening, and manual accounting vouchers should also check period locks before create/post/cancel.
- Posted manual vouchers need a reversal flow, not only cancel/edit blocking.

Priority: High.

### 5. Posting Engine Needs Tax And Edge-Case Completion

Current state:

- Main source modules post accounting vouchers.
- Sales/purchase ledgers and cash/bank ledgers are dynamic.

Gap:

- Verify GST split ledger behavior for all tax types: CGST/SGST, IGST, exempt, nil, export.
- Add debit note and credit note voucher behavior.
- Add round-off, discount, TDS, freight, export exchange gain/loss rules as configurable ledgers.
- Add clear fallback behavior when a tenant has no configured tax/rounding/TDS ledger.

Priority: High.

### 6. Reports Need Reconciliation Views

Current state:

- Trial balance, profit and loss, balance sheet, day book, cash book, bank book, and monthly movement exist.
- Recalculate/repost options exist.

Gap:

- Add reconciliation reports:
  - Source entry total versus accounting voucher total.
  - Invoice/bill outstanding versus receipt/payment allocation ledger.
  - Cash/bank book source rows versus account postings.
  - GST source totals versus GST ledger postings.
- Add drill-down from report rows to source document and voucher.

Priority: High.

### 7. Allocation Picker Still Loads Full Lists

Current state:

- Receipt/payment frontend uses autocomplete lookup flavor.
- Options are built from loaded sales/purchase lists.

Gap:

- Replace full-list loading with backend searchable open-document endpoints.
- Add server-side pagination/search by document no, party, date, and amount.
- Return only open balance documents for the active company/accounting year.

Priority: Medium.

### 8. Status Transitions Are Still Loose

Current state:

- Draft/posted/cancelled-like statuses exist.
- Posted direct mutation is blocked for main entry modules.

Gap:

- Define allowed status transitions per module.
- Enforce transition rules in repositories/services.
- Add explicit post/cancel buttons and endpoints instead of relying on generic save with status changes.
- Ensure compliance generation, print, email, and accounting posting only run from allowed states.

Priority: Medium.

### 9. Stock Outward Is Still Separate From Sales Posting

Current state:

- Purchase receipt, delivery note, stock ledger, and barcode verification exist.
- Sales accounting and stock movement are not one controlled posting flow.

Gap:

- Wire stock-managed sales to availability checks.
- Reserve/consume stock through delivery note or sales posting.
- Define reversal behavior for stock movement when a posted sale is reversed.

Priority: Medium for stock-enabled tenants.

### 10. Operational Hardening Is Needed Before Production Filing

Current state:

- Compliance gateway state and audit tables exist.
- Accounting audit tables exist for posting and correction/reversal.

Gap:

- Add queue retry workers for failed compliance/report/posting jobs.
- Add admin visibility for failed posting/compliance actions.
- Add migration/version tracking for tenant schema changes.
- Add automated tests for posting, period locks, over-allocation, correction, and reversal.

Priority: Medium.

## Immediate Next Work

1. Add allocation settlement service to update linked sales/purchase balances from posted receipt/payment allocations.
2. Add backend searchable open-document endpoints for receipt/payment allocation lookup.
3. Enforce period locks in manual accounting vouchers.
4. Add frontend period-lock management page for accounting/super-admin.
5. Add reconciliation report: source document total versus accounting voucher total.
6. Add correction/reversal source link columns or metadata on entry records.

## Decision

The main screen gap is mostly closed. The real risk is now consistency: a posted document must produce balanced ledger posting, linked allocation settlement, immutable audit history, and report totals that reconcile back to the source. The next work should therefore focus on settlement, lock coverage, reconciliation, and status semantics before adding more visible entry fields.
