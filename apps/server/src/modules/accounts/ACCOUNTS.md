# Accounts Module Plan

**Date:** 2026-06-10
**Version:** 1.0.93
**Module:** `apps/server/src/modules/accounts`
**Goal:** Build a proper tenant-local Indian accounting engine with Tally-like double-entry posting, source audit, and report-friendly live rollups.

## Work Boundary

Accounts is a first-class tenant module. It must belong to the tenant/client workspace and must use `TenantContextService` before touching tenant-local data.

The first Accounts slice kept entry modules untouched while the core accounting engine was built. The current completed wiring slice touches only:

- `apps/server/src/modules/entries/receipt`
- `apps/server/src/modules/entries/payment`

Receipt/Payment posting is already bridged. The current slice adds Sales/Purchase voucher posting without replacing existing entry tables or changing old entry behavior.

## Existing State Verified

Backend files currently present:

- `accounts.module.ts` registers the accounts controller, service, repository, tenant context, auth/tenant repositories, and document number repository.
- `accounts.controller.ts` exposes `GET /api/v1/accounts/ledgers`, `GET /api/v1/accounts/ledgers/:type`, ledger upsert, cash-book/bank-book list/get/upsert/destroy/restore/comment/tool APIs.
- `accounts.service.ts` resolves tenant context with `company.manage` and delegates to the repository.
- `accounts.repository.ts` auto-creates default cash, bank, and fixed asset ledgers; saves cash/bank book entries; recalculates running ledger balance; writes comments and activities; uses document numbering for cash and bank books.
- `accounts.migration.ts` creates `account_ledgers`, `cash_books`, `bank_books`, `account_book_comments`, and `account_book_activities`, and migrates old `account_ledger_entries` data into split cash/bank tables.
- `accounts.types.ts` defines the current ledger and cash/bank book types.
- Tenant provisioning calls `migrateAccountsTables` from `apps/server/src/infrastructure/tenant-database/tenant-database.connection.ts`.

Frontend files currently present:

- `apps/frontend/src/features/accounts/accounts-client.ts` calls the existing accounts APIs.
- `apps/frontend/src/features/accounts/accounts-book-page.tsx` renders Cash Book and Bank Book list/show/upsert/print workflows.
- Dashboard wiring already exposes Accounts as an app with Cash Book and Bank Book pages, while Billing also links the same book pages.

Important current limitations:

- The module is a cash/bank book CRUD surface, not a full accounting engine.
- There is no formal chart of accounts hierarchy.
- There is no normalized double-entry voucher/posting table.
- There are no journal, contra, debit note, credit note, opening balance, adjustment, or year-end vouchers.
- Cash Book and Bank Book are stored as direct book tables instead of being derived from ledger postings.
- Reports such as ledger statement, day book, trial balance, profit and loss, and balance sheet are not available from the backend.
- Existing ledger `uuid` columns are `VARCHAR(80)`, while new application-owned tables should follow the current project rule: `id INT AUTO_INCREMENT PRIMARY KEY` plus `uuid CHAR(8) NOT NULL UNIQUE`.
- `accounts-book-page.tsx` is large and should be split when frontend work begins.

## Indian Accounting Standard Target

The engine should follow common Indian SME accounting practice and be compatible with later Tally/Frappe style posting:

- Double-entry accounting with every posted voucher balanced: total debit equals total credit.
- Company and accounting year are mandatory context on every accounting voucher and posting.
- Amounts are stored in INR by default with 2-decimal precision.
- Ledger balances carry a natural side: Debit or Credit.
- Cash and bank balances must never be inferred from entry modules directly; they should come from posted ledger movements.
- GST, TDS, TCS, round-off, freight, discount, customer, supplier, bank, and cash ledgers must be normal ledger accounts, not special hard-coded fields.
- Suspended/cancelled vouchers must reverse or deactivate postings safely without deleting audit history.
- Reports must be generated from postings, not from Sales/Purchase/Receipt/Payment forms.

## Core Accounting Model

### Account Groups

Create a real chart of accounts group tree with Indian defaults:

- Assets
  - Fixed Assets
  - Current Assets
  - Bank Accounts
  - Cash-in-Hand
  - Sundry Debtors
  - Loans & Advances (Asset)
  - Deposits
- Liabilities
  - Capital Account
  - Reserves & Surplus
  - Secured Loans
  - Unsecured Loans
  - Current Liabilities
  - Sundry Creditors
  - Duties & Taxes
  - Provisions
- Income
  - Sales Accounts
  - Direct Incomes
  - Indirect Incomes
- Expenses
  - Purchase Accounts
  - Direct Expenses
  - Indirect Expenses
- Suspense Account

Each group needs:

- `id`, `uuid`, `tenant_id`, `company_id`, `accounting_year_id`
- `parent_id`, `path`, `name`, `system_key`
- `nature`: `asset`, `liability`, `equity`, `income`, `expense`
- `normal_balance`: `debit` or `credit`
- `affects_gross_profit` for trading/P&L split
- active/deleted/audit timestamps

### Ledgers

Replace the current limited ledger type idea with full ledger masters:

- `group_id`
- `ledger_type`: `cash`, `bank`, `customer`, `supplier`, `gst`, `tds`, `tcs`, `sales`, `purchase`, `expense`, `income`, `asset`, `liability`, `equity`, `round_off`, `other`
- `name`, `alias`, `code`
- GST fields: GSTIN, registration type, place of supply/state, tax category where needed
- Bank fields: bank name, account number, IFSC, branch, UPI where needed
- opening debit/credit
- current debit/credit derived from postings
- contact/product/company links where needed later

The existing `account_ledgers` table can be migrated forward, but new ledger fields should support Indian accounting groups and natural balance side.

### Vouchers

Create a normalized accounting voucher header:

- `account_vouchers`
- voucher types: `opening`, `contra`, `receipt`, `payment`, `journal`, `sales`, `purchase`, `debit_note`, `credit_note`, `gst_adjustment`, `year_end`
- `voucher_no`, `voucher_date`, `reference_no`
- `source_module`, `source_uuid` for future entry integration
- `status`: `draft`, `posted`, `cancelled`
- `narration`, `party_ledger_id`
- `posted_at`, `cancelled_at`, actor/audit fields

For this Accounts-first slice, implement manual accounting vouchers first:

- Opening Balance
- Contra
- Journal

Leave Receipt/Payment entry module wiring for a later slice. If a manual receipt/payment voucher type is needed inside Accounts later, keep it isolated from the existing Receipt/Payment entry modules until the posting bridge is designed.

### Voucher Lines / Postings

Create normalized voucher lines:

- `account_voucher_lines`
- `voucher_id`, `ledger_id`
- `debit_amount`, `credit_amount`
- `line_narration`
- `cost_center_id` nullable for future
- `bill_reference` nullable for future outstanding tracking
- `sort_order`

Create immutable or append-friendly ledger postings:

- `account_postings`
- `voucher_id`, `voucher_line_id`, `ledger_id`
- `posting_date`, `debit_amount`, `credit_amount`
- `source_module`, `source_uuid`
- `is_active`, `reversal_of_posting_id`

Reports and books should read from `account_postings`.

## Cash Book And Bank Book Direction

Keep the existing Cash Book and Bank Book UI usable for now, but the accounting engine target is:

- Cash Book = filtered ledger postings for ledgers under Cash-in-Hand.
- Bank Book = filtered ledger postings for ledgers under Bank Accounts.
- Current `cash_books` and `bank_books` can remain as legacy/manual book tables until the new posting-backed views replace them.
- Receipt and Payment entries now post source-linked vouchers into `account_vouchers`, `account_voucher_lines`, and `account_postings`.
- Sales and Purchase entries post source-linked vouchers with party, sales/purchase, GST, discount, and round-off lines.

## Backend API Plan

Implemented in this slice:

- `GET /chart/groups`
- `GET /ledgers`
- `GET /vouchers`
- `GET /vouchers/:uuid`
- `POST /vouchers/upsert`
- `POST /vouchers/:uuid/post`
- `POST /vouchers/:uuid/cancel`
- `GET /reports/day-book`
- `GET /reports/ledger/:ledgerUuid`
- `GET /reports/trial-balance`
- `GET /reports/profit-loss`
- `GET /reports/balance-sheet`

Still planned:

- `POST /chart/groups/upsert`
- full ledger master endpoint beyond the existing `GET /ledgers`, `GET /ledgers/:type`, and `POST /ledgers/:type/upsert`
- posting-backed `GET /books/cash`
- posting-backed `GET /books/bank`
- posting rebuild trigger for programmatic account rollups

Validation rules:

- No posting without default company and accounting year.
- Posted voucher must have at least two lines.
- Debit and credit totals must match exactly after 2-decimal rounding.
- No negative debit/credit line amounts.
- A line cannot contain both debit and credit.
- Ledger must be active and belong to the same tenant/company/year context.
- Posted voucher edits should require unpost/cancel/reversal behavior, not silent mutation.

## Migration Plan

1. Keep existing `account_ledgers`, `cash_books`, and `bank_books` stable for compatibility.
2. Add account group tables and seed Indian default groups per tenant/company/year.
3. Add new fields to `account_ledgers` only where safe, or create a replacement ledger table only if migration becomes cleaner.
4. Backfill current cash/bank/fixed asset ledgers into the correct Indian account groups.
5. Add `account_vouchers`, `account_voucher_lines`, and `account_postings`.
6. Add posting service methods and wire Receipt/Payment entries after the Accounts engine compiles and renders.
7. Add Sales/Purchase source posting after the party/tax/sales-purchase ledger rules are explicit.
8. Add report repositories from `account_postings` and programmatic summary tables.
9. Later, migrate legacy cash/bank book entries into opening/manual vouchers only after the new engine is verified.

## Frontend Plan

After backend foundations:

- Add Accounts Overview with balances and report shortcuts.
- Add Chart of Accounts page with group tree and ledger list.
- Add Ledger page with opening/current balance and posting drill-down.
- Add Journal/Contra voucher page.
- Add Day Book, Ledger Statement, Trial Balance, Profit & Loss, and Balance Sheet pages.
- Split `accounts-book-page.tsx` into smaller components before expanding it further.
- Keep current Cash Book and Bank Book screens available until replacement posting-backed views are ready.

## Implementation Phases

### Phase 1 - Foundation

- [x] Refresh this plan and assist task docs.
- [x] Add account groups migration and Indian default group seeding.
- [x] Add normalized voucher, voucher line, and posting tables.
- [x] Add typed backend models for groups, ledgers, vouchers, lines, postings, and reports.
- [x] Add service/repository methods for balanced manual vouchers.

### Phase 2 - Core APIs

- [x] Add chart of accounts read API.
- [ ] Add chart of accounts mutation APIs.
- [ ] Add ledger master APIs for full account ledgers.
- [x] Add manual voucher upsert API for journal/contra/opening style vouchers.
- [x] Add post/cancel actions with posting activation/deactivation behavior.
- [x] Add backend validation helpers for debit/credit balancing.

### Phase 3 - Reports

- [x] Add Day Book from accounting vouchers.
- [x] Add Ledger Statement from postings.
- [x] Add Trial Balance by ledger/group.
- [x] Add Profit & Loss from income/expense groups.
- [x] Add Balance Sheet from asset/liability/equity groups.

### Phase 4 - Frontend Accounts Desk

- [x] Add Accounts Overview.
- [x] Add Chart of Accounts read screen.
- [x] Add manual voucher screen for journal/contra/opening-style vouchers.
- [x] Add Day Book, Trial Balance, Profit & Loss, and Balance Sheet report screens.
- [x] Keep Cash Book and Bank Book pages intact until posting-backed versions are ready.
- [ ] Add full ledger master editing screen.
- [x] Add posting-backed Cash Book and Bank Book screens.

### Phase 5 - Entry Wiring

- [x] Compare Receipt/Payment entry shapes to the posting contract.
- [x] Add posting bridge for Receipt and Payment after Accounts engine verification.
- [x] Create source-linked posted vouchers for active Receipt/Payment rows.
- [x] Replace source voucher lines/postings on Receipt/Payment update.
- [x] Cancel source postings when Receipt/Payment entries are suspended, cancelled, or restored inactive.
- [x] Split TDS, discount, and round-off into dedicated ledgers instead of using net amount only.
- [x] Add Sales/Purchase posting with GST and party ledger checks.
- [x] Add posting-backed Cash Book and Bank Book views.

### Phase 6 - Tally-Like Source Posting And Rollups

Current implementation target:

- [x] Add programmatic posting audit records for every create/update/cancel/rebuild.
- [x] Add programmatic summary rows so dashboards/monthly reports do not repeatedly scan all source entries.
- [x] Add optional entry-level and item-level accounting fields without disturbing existing entry fields.
- [x] Post Sales entries as `sales` vouchers:
  - Debit Customer.
  - Credit Sales ledger or classified sales ledger.
  - Credit Output CGST/SGST or Output IGST.
  - Credit Discount Received if discount is treated after taxable split later.
  - Post round-off to Round Off ledger on the correct debit/credit side.
- [x] Post Purchase entries as `purchase` vouchers:
  - Debit Purchase ledger or classified purchase ledger.
  - Debit Input CGST/SGST or Input IGST.
  - Debit Round Off ledger when expense-side.
  - Credit Supplier.
- [x] Create default garment-oriented ledgers where needed:
  - Fabric Sales
  - Garment Sales
  - Export Sales
  - Fabric Purchase
  - Garment Purchase
  - Accessories Purchase
- [x] Fall back to normal Sales Account or Purchase Account when no classification is selected.
- [x] Keep auditor language in backend names and reports, but expose friendly labels in client UI:
  - Sundry Debtors = Customers
  - Sundry Creditors = Suppliers
  - Sales Accounts = Sales
  - Purchase Accounts = Purchases
  - Duties & Taxes = Taxes
- [x] Add backend rebuild trigger that refreshes source posting summaries.
- [x] Split Receipt/Payment settlement vouchers into cash/bank, customer/supplier, TDS, discount, and round-off ledgers.

## Verification Plan

Backend checks:

- `npm -w apps/server run typecheck`
- `npm -w apps/server run build`

Frontend checks once UI changes start:

- `npm -w apps/frontend run typecheck`
- `npm -w apps/frontend run build`

Accounting behavior checks:

- Seeded chart has all Indian default groups once per tenant/company/year.
- Manual journal cannot post if debit and credit totals differ.
- Posted voucher creates balanced postings.
- Cancelling a posted voucher deactivates or reverses postings without deleting audit records.
- Trial balance totals debit and credit equally.
- Cash Book and Bank Book legacy screens still load.
- Receipt and Payment source entries create balanced account postings.
- Suspended Receipt and Payment entries deactivate their source postings.
