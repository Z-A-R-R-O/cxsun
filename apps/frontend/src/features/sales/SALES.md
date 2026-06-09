# SALES

## Summary
Sales invoice management system for recording domestic sales transactions with line items, customer handling, tax calculations, configurable sales settings, WhiteBooks-backed e-invoice/e-way actions, and A4 tax invoice print with QR code and barcode.

## What We Done
- Sales invoice list with MasterListPageFrame (search, paginated grid, edit/delete)
- Sales invoice form with date, customer selection, items grid (product, quantity, rate, discount, tax), freight, loading charges
- Customer autocomplete with contact-role-filter
- Tax calculation (CGST/SGST/IGST) with GST type support
- Round-off and net amount computation
- Tax invoice print layout with A4 template (letterhead, line items table, amount in words, TCS, tax summary, signature)
- Code128 barcode generation (sales-barcode.ts)
- Static QR code for GST portal link
- Line budgeting algorithm for print layout
- API client with typed request/response models
- Delete confirmation dialog
- Sales Settings driven layout controls for PO, DC, colour, size, E-invoice tab, and E-way tab
- Sales print controls for logo, bank account number, QR account details, letterhead tuning, and custom terms
- E-invoice generation enabled through the GST compliance client using the WhiteBooks GSP provider
- E-way bill generation enabled from saved IRN details, with the generated E-way bill number saved back to the sales invoice
- Printed sales invoice shows saved IRN, acknowledgement, E-way details, signed QR payload, and E-way barcode when available
- Extended sales invoice print template auto-switches when item rows exceed the 12-line standard invoice budget
- Extended print item-only pages carry up to 24 item rows, show `To be continued...`, and move totals/signature/footer to the final continuation page with `Carry forward from previous page`
- Sales invoices generated from quotations store source metadata (`source_type`, source quotation references, and source quotation UUIDs)
- Sales show page displays the originating quotation references for quotation-generated invoices
- Suspending a quotation-generated Sales invoice releases its source quotations back to `posted` so they can be edited and regenerated

## Print Notes
- Standard print remains unchanged for invoices with 12 or fewer item rows.
- Extended print is used automatically for invoices with more than 12 item rows.
- The first extended item page is reserved for item rows and can hold up to 24 compact rows before the totals page.
- The final extended page keeps totals, amount in words, declaration, bank/footer details, jurisdiction, and signature together.
- Temporary verification invoices were API-created outside seed data for 15, 19, and 24 item-row fit checks.

## Gaps
- No sales order -> invoice workflow
- No delivery challan/challan-to-invoice conversion
- No sales return/credit note
- No customer payment tracking per invoice
- No shipment/delivery tracking
- No multi-currency sales
- No recurring invoice support
- No partial invoice fulfillment
- No bulk e-invoice/e-way generation from the sales list

## Future Concepts
- Sales order/quotation/proforma workflow
- Delivery challan generation and tracking
- Credit note/sales return processing
- Bulk E-invoice (IRN) and E-way bill processing
- E-way validity tracking, cancellation, and extension workflow
- Recurring invoice automation
- Customer payment link sharing
- Sales analytics (revenue by product/customer/region)
- Multi-currency with exchange rate handling
