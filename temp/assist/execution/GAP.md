# Simple Billing Gap Review

Date: 2026-05-12
Reference: `#82`
Product intent: simple billing for small business users with company/year isolation, fast invoice entry, clean print output, receipts/payments, GST basics, and practical reports.

## Current Working Base

- Core entry modules exist for Sales, Purchase, Receipt, and Payment.
- Sales has the most complete workflow: list, create/edit, item table, GST totals, print template, save-and-print, contact/product lookup, and company/year context passed to the backend.
- Backend entry APIs now require `companyId` and `accountingYearId` for list, detail, create, update, and delete.
- Database entries have `company_id` and `accounting_year_id` columns with document uniqueness per company/year.
- Company switcher and per-company settings work has started.
- Reports exist for Customer Statement, Supplier Statement, and GST Statement.
- Account page and password-change path exist.

## Critical Gaps

## Fixed From This Review

- Active company context is now used for Sales, Purchase, Receipt, Payment print company details and Customer Statement, Supplier Statement, and GST Statement report headers. These paths no longer choose `isPrimary` or the first company after a company switch.
- Document numbering is now backend-backed by company/accounting-year/kind document settings. Sales, Purchase, Payment, and Receipt new forms load automatic previews, create flows reserve numbers on the backend, and manual override remains available by editing the number field.
- Company settings for Sales Settings, Duties & Taxes, Apps, Customise, and Features are now persisted through authenticated backend company settings endpoints, isolated by company, shared across devices, and protected by company read/update permissions. Browser storage remains only as a local cache/fallback.

### P0 - Must Fix Before Calling It Ready

- Dashboard still feels like a platform scaffold, not a billing product home. The application cards still include generic/scaffold workspaces and billing links do not open a focused billing dashboard with Sales, Purchase, Receipt, Payment, Contacts, Products, and Reports as the main path.
- Receipt and Payment allocations are manual text fields. They do not fetch open invoices/bills, validate available balance, or update invoice/bill paid and balance amounts automatically.
- Receipt party selection is weaker than Sales/Payment. Receipt uses a plain customer name input instead of a contact lookup, so statements and balances can split the same customer by spelling.
- Payment supplier lookup currently reuses the Sales contact lookup path. That risks showing customer-oriented contacts for supplier payments unless contact-type filtering is made explicit.
- Backend validation is still too light for billing. Entries should reject missing party, empty item rows, invalid dates outside the selected accounting year, negative quantities/rates where not allowed, invalid GST split, and status transitions that should be locked.
- Posted/cancelled behavior is not strict. The UI exposes draft/posted/cancelled, but backend rules do not yet protect posted invoices from unsafe edits or define cancellation reversal behavior.

### P1 - Needed For Daily Billing Use

- Purchase entry is not as polished as Sales. It lacks the same lookup depth, loader/error handling, auto-numbering, and product/tax helper flow seen in Sales.
- Receipt and Payment save flows lack strong error banners/loaders compared with Sales, so failures can feel silent or abrupt.
- Sales item calculations are mostly frontend-driven. Backend should recompute subtotal, discount, taxable, GST, round off, grand total, paid amount, and balance instead of trusting client totals.
- Product stock fields exist, but billing does not update stock. Simple billing with products usually needs at least optional stock reduce on Sales and stock add on Purchase.
- Reports are frontend aggregates from loaded records. This will not scale well and can drift from backend business rules; statement and GST reports should have backend report endpoints filtered by company/year/date/party.
- Customer and supplier statements match parties by name. They should use `partyId` where available and fall back to name only for legacy/manual entries.
- GST Statement is useful but incomplete for compliance. Missing taxable split by GST rate, HSN/SAC summary, B2B/B2C separation, nil/exempt handling, credit/debit note handling, and export formats.
- Print output exists but delivery is missing. Simple billing usually needs PDF download, share/email/WhatsApp hooks, and a stable print preview path.
- Company profile completeness is not enforced before printing. Billing should warn if legal name, address, GSTIN, phone/email, or bank details are missing.
- Accounting year switching exists as context, but there is no clear year close/open workflow or date guard that prevents entries outside the active year.

### P2 - Product Polish And Operational Gaps

- First-run flow needs a billing-oriented checklist: company details, GST setting, invoice prefix, contact/product defaults, bank account, and first invoice.
- Sidebar and dashboard should reduce non-billing surface for normal users. Admin/Organisation scaffolds are hidden for roles, but the product still needs a simpler operator path.
- Contacts are shared/common by design, but billing needs clearer customer/supplier/staff quick-create behavior and contact-type enforcement in each voucher.
- Products are shared/common by design, but invoice entry needs a fast inline product create/edit path with HSN, unit, GST, price, and optional stock defaults.
- No audit/activity view for billing changes beyond the collaboration panel surface. Simple billing should record who created, edited, posted, cancelled, printed, or deleted each entry.
- No import/export path for opening contacts, products, and opening balances.
- No backup/restore UI for a small business operator.
- No cash/bank book, day book, sales register, purchase register, outstanding receivables/payables summary, or profit snapshot.
- No role-specific permission checks are visible in the frontend actions. Hidden menus are good, but action buttons should also reflect effective permissions.
- Setup CORS needs final environment alignment so frontend/backend port changes do not block first-run setup requests.

## Suggested Execution Order

1. Replace the scaffold application dashboard with a Billing Home page.
2. Make active company/accounting-year the single source for all billing lists, forms, reports, and print headers.
3. Move per-company billing settings from local storage to backend persistence.
4. Add backend document-number sequences for Sales, Purchase, Receipt, and Payment.
5. Finish party/product lookup consistency across all vouchers.
6. Build real allocation selection and balance updates for Receipt and Payment.
7. Add backend validation/recalculation/status rules for all entry saves.
8. Move statements and GST reports to backend report endpoints.
9. Add PDF/share/export output for invoices, receipts, payments, and reports.
10. Add a guided first-run billing setup checklist.

## Definition Of Ready For Simple Billing

- A normal user logs in and lands on a billing-focused home.
- The selected company and accounting year are visible, switchable, and used everywhere.
- Sales, Purchase, Receipt, and Payment can be created quickly without manual ids or duplicated party names.
- Invoice and voucher numbers are generated safely by the backend.
- Receipt/Payment allocations update balances.
- Print/PDF output uses the active company details.
- Basic GST and statement reports match saved backend data.
- Normal users see only the billing paths they can use.

---

# System Update Gap Review

Date: 2026-05-13
Reference: `#91`
Product intent: let a trusted operator pull the latest GitHub version, build the Docker app image, restart the running app, and verify health from the System Update page.

## Current Working Base

- System Update page calls authenticated backend endpoints for status, preflight, sync, build, restart, smoke, and deploy.
- Backend exposes `system-update` controller actions protected by the existing auth update permission.
- Backend URL rewrite now accepts both `/api/v1` and `/v1`, so deployed frontend calls to `/v1/system-update/deploy` can reach the controller.
- Update script supports preflight, Git fetch/pull, Docker Compose build, Docker Compose restart, and optional smoke test.

## Fixed From This Review

- Backend System Update writable actions now use a single-flight lock, so sync, build, restart, smoke, and deploy cannot be started concurrently inside the running backend process.
- A second writable action now receives a clear `409 Conflict` busy response with the running action, operation id, and started timestamp.
- System Update status responses expose the active operation while the lock is held, and the frontend disables conflicting actions when another tab/user has an action running.
- Deploy/restart/rollback actions now require confirmation before execution.
- System Update operations are persisted to `system_update_operations` with requester, progress, stdout/stderr tail, commit metadata, and started/finished timestamps.
- Deploy now runs a database backup gate and database migration step before build/restart.
- System Update controller access moved from broad `auth.update` to dedicated `system-update.run` / `system-update.read` RBAC catalog permissions, assigned through the super admin role blueprint.
- Next.js now proxies same-origin `/v1/*` requests as well as `/api/v1/*`.
- Rollback can rebuild/restart from the previous successful deploy commit recorded in operation history.
- Added route rewrite tests for both `/api/v1/system-update/*` and `/v1/system-update/*`.

## Critical Gaps

### P0 - Must Fix Before Calling It Ready

- The restart helper assumes image/tag and container names match `cxnext-app:${APP_VERSION:-local}` and `cxnext-app`. Any changed compose service, image name, or container name can break self-restart.

### P1 - Needed For Daily Operation

- System Update menu/card visibility is static. The page link can appear for users who later fail backend permission checks.
- `status` and `preflight` execute external commands on page load. This can make Settings slow and can hit GitHub every time the page opens.
- Failure reporting can expose raw stdout/stderr in the UI. Git URLs, paths, env-derived values, or command output may leak operational details.
- Timeout handling kills only the direct child process. Grandchild Docker/Git processes can survive after timeout on some platforms.
- The script falls back to a hardcoded public GitHub URL. Production should require explicit configured repository details instead of silently using a default.

### P2 - Product Polish And Operational Gaps

- The page does not clearly show whether System Update is enabled or disabled before the user clicks an action.
- There is no "new version available" state beyond local/latest hash text.
- There is no dry-run plan showing exact branch, local commit, remote commit, image tag, compose file, and container before deploy.
- Manual actions are available independently, but the UI does not explain current stage, last successful stage, or whether build is stale after pull.
- Smoke test is optional and only reports final pass/fail; it does not show which health check failed.

## Suggested Execution Order

1. Make restart helper image/service/container names fully configurable and validate them during preflight.
2. Add a dry-run deploy plan showing branch, local commit, remote commit, image tag, compose file, and container.
3. Reduce expensive GitHub/preflight checks on initial Settings load with explicit refresh controls or cached status.
4. Sanitize raw stdout/stderr before showing command output to operators.
5. Add process-tree timeout handling for child Git/Docker commands.
6. Add smoke-test detail so the UI shows which health check failed.
