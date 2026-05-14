# Planning

Active reference: `#93`

## Active

- `#93` Add separate stock module and billing stock ledger
  - Goal:
    - Move operational inventory out of product-local legacy fields into a separate stock context and make daily billing update stock from purchase and sales entries.
  - Scope:
    - Database stock ledger migration and stock auth catalog sync seeder
    - Backend Stock module, stock service, APIs, and module registry registration
    - Sales/purchase create, update, and delete hooks into stock movement resync
    - Billing workspace Stock page and navigation
    - Execution log, changelog, and lockstep version update
  - Constraints:
    - Keep products as catalog records; stock tables reference `product_id` instead of expanding product ownership.
    - Use the existing local database and billing entry flow without adding Redis or async workers for stock posting.
    - Prepare warehouse, barcode, serial, and batch tables now even if the first billing flow posts to a default warehouse only.
  - Implemented:
    - Added `stock_warehouses`, `stock_batches`, `stock_serial_numbers`, `stock_barcodes`, `stock_movements`, and `stock_balances` with company/year/product/warehouse context.
    - Added a backend Stock module with summary, movement, and warehouse endpoints guarded by new `stock.*` permissions.
    - Added a follow-up auth seeder so existing deployed databases receive stock permission modules and role grants.
    - Wired purchase entries to post inbound stock movements and sales entries to post outbound movements, with update/delete replacing or clearing source movements and recalculating balances.
    - Added `/desk/stock` with balances, warehouse list, and recent movement views, and linked Stock into the Billing sidebar and overview.
  - Validation:
    - `pnpm --filter @cxnext/types build`
    - `pnpm --filter @cxnext/db typecheck`
    - `pnpm --filter @cxnext/server typecheck`
    - `pnpm --filter @cxnext/frontend typecheck`
    - `pnpm db:migrate`
    - `pnpm db:seed`
    - `pnpm --filter @cxnext/server build`
    - API smoke: login, create purchase `+5`, create sale `-2`, verify balance `3`, delete both entries, verify movements and balances clear.
  - Residual risk:
    - Batch, serial, and barcode tables are prepared but the current sales/purchase forms do not yet collect per-line batch, serial, or barcode selections. The first billing wire posts to the default stock warehouse.
