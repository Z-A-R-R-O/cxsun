# Task

Active reference: `#93`

## Active

- [x] `#93` Add separate stock module and billing stock ledger
  - [x] Phase 1: inspect billing stock gaps
    - [x] 1.1 Review product, sales, purchase, common warehouse, entry, and auth catalog shapes.
    - [x] 1.2 Confirm stock state was product-local legacy data and not updated by billing entries.
  - [x] Phase 2: implement stock context
    - [x] 2.1 Add stock warehouse, barcode, serial, batch, movement, and balance tables linked by product id.
    - [x] 2.2 Add backend Stock module, stock APIs, and auth catalog permissions.
    - [x] 2.3 Wire purchase entries to add stock and sales entries to reduce stock, including update/delete resync.
    - [x] 2.4 Add Billing > Stock frontend page and navigation.
  - [x] Phase 3: validate and track
    - [x] 3.1 Run migrations, seed stock permissions, focused typechecks, and backend build.
    - [x] 3.2 Run API smoke for purchase in, sales out, stock balance, and delete reversal.
