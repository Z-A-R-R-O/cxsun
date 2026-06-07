# Export Sales

## Summary
Export sales invoice management with full CRUD, line-item editing, print document generation (tax invoice with barcode/QR, multiple copies), comments/activities, entry tools (email, assign, attachments, tags, WhatsApp), and GST e-invoice/e-way bill integration.

## What We Done
- `export-sales-page.tsx` — Full CRUD list/show/upsert. List with column visibility toggle, search (invoice no, customer, date, work order, status), status filter (all/draft/posted/cancelled), pagination. Show view with print-ready invoice document (selectable copies: original/duplicate/triplicate), prev/next navigation, comments, activity timeline, entry tools (email with print HTML capture, assign, file attachments, tags, WhatsApp). Upsert with tabs: Details (customer autocomplete with inline contact creation, work order, invoice no auto-preview, date, currency autocomplete, sales type select, line items with product autocomplete, PO/DC/colour/size fields conditional on software settings, rate, quantity, discount, tax, line totals), Address (billing/shipping address with country/state/district/city/pincode cascade, copy-to-shipping), E-way (conditional — transport autocomplete, vehicle no, e-way bill no/date, part), E-invoice (conditional — IRN/ack details from GST compliance), Terms (notes, terms). Save / Save & Print actions.
- `export-sales-client.ts` — `listExportSalesEntries`, `getExportSalesEntry`, `upsertExportSalesEntry`, `destroyExportSalesEntry`, `restoreExportSalesEntry`, `addExportSalesComment`, `runExportSalesTool`, `listExportSalesContactLookups`, `listExportSalesProductLookups`, `listExportSalesOrderLookups`, `listExportSalesCommonLookups`. Types: `ExportSalesEntry`, `ExportSalesEntryInput`, `ExportSalesEntryItem`, `ExportSalesLookupOption`.
- `export-sales-print-page.tsx` — `ExportSalesInvoiceDocument` component: full A4 tax invoice layout with letterhead, party addresses (bill-to/ship-to), item table with configurable columns (PO/DC/colour/size based on settings), totals (taxable, CGST/SGST or IGST, grand total), amount-in-words, terms, bank account details, barcode (Code128) of invoice no, e-invoice QR code (generated from IRN payload), signature blocks. Copy labels (original/duplicate/triplicate).
- `export-sales-barcode.ts` — `createCode128BarcodeSvg`: pure SVG Code128 B barcode generator from value.
- `export-sales-print-qr.ts` — Portal QR cell pattern data for static SVG QR code decoration.
- `export-sales-print-line-plan.ts` — Item line budgeting for print layout (max 12 lines per page, blank row fill, two-page fallback).
- `main-print-template.tsx` — `MainPrintTemplate` with A4 @page CSS, print media overrides, page-break between copies.

## Gaps
- Print line plan always returns 1 line per item regardless of content.
- E-invoice QR code generation logic (`buildExportSalesEinvoiceQrPayload`) is used but not visible in source.
- No PDF export/download — relies on browser print.
- No partial shipment or delivery note workflow.
- No credit note / debit note linked to invoice.
- Tool activities (email, WhatsApp) record intent but no actual send implementation visible.

## Future Concepts
- Server-side PDF generation with download.
- Credit note and debit note linked to invoices.
- E-invoice IRN generation wizard (API integration).
- E-way bill generation and tracking.
- Shipment tracking and delivery status.
- Bulk invoice printing and emailing.
