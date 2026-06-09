# QUOTATION

## Summary
Quotation entry management for customer quote capture and month-end consolidation into a draft Sales invoice.

## What We Done
- Added Quotation list, show, and upsert screens cloned from Sales entry behavior.
- Reused Sales-style customer, product, HSN, unit, tax, transport, and address autocompletes.
- Added `QUO-0001` style backend numbering separate from Sales invoice numbering.
- Wired Quotation into Billing > Entries in the dashboard.
- Added list multi-select and contact filtering.
- Added a visible Invoice Ref column on the Quotation list showing the generated Sales invoice number for invoiced quotations.
- Added Generate Invoice from selected quotations.
- Validates all selected quotations belong to the same contact before invoice generation.
- Consolidates matching item lines by product/details/rate/discount/tax and sums quantities.
- Creates the generated Sales invoice in draft mode with quotation numbers stored in `reference_no` and source metadata stored on the Sales invoice.
- Marks source quotations as `invoiced` and stores the generated Sales invoice UUID/number on each quotation.
- Blocks already-invoiced quotations from edit and from Generate Invoice selection.
- Releases linked quotations back to `posted` when the generated Sales invoice is suspended.

## Notes
- The backend performs the authoritative same-contact validation.
- The backend also performs the authoritative already-invoiced validation.
- Generated invoices are normal Sales entries and can be reviewed or edited before posting.
- To edit an invoiced quotation, first suspend the generated Sales invoice. This clears the quotation invoice lock, then the quotation can be edited and selected again.
- Quotation print currently reuses the Sales invoice print document and Sales print settings.
- E-invoice/e-way controls follow the existing Sales settings because Quotation is implemented as a Sales clone surface.

## Verification
- API-created two same-contact quotations and generated draft Sales invoice `SAL-0025`.
- Confirmed repeated item `fabric-a` consolidated from quantity 2 + 3 into quantity 5.
- Confirmed mixed-contact quotation generation returns HTTP 400.
- Browser smoke check confirmed Quotation menu, contact filter, row selection, selected count, and Generate Invoice enablement.
- API-created two lock-flow quotations and generated draft Sales invoice `SAL-0029`.
- Confirmed generated quotations moved to `invoiced`, duplicate generation returned HTTP 400, and suspending `SAL-0029` released both quotations back to `posted`.
