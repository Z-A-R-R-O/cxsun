# Session Plan

**Date:** 2026-06-06
**Version:** 1.0.84
**Focus:** Stabilize the current Billing and Export Sales application shape.

## Objective

Keep the current tenant Billing desk coherent after the Export Sales, overview, settings, GST, print, and mail updates.

## Remaining Scope

### Export Sales

- Verify currency selection persists and appears correctly in list/show/print where required.
- Verify `feature-export-sales` enabled and disabled states across navigation, overview, routes, shortcuts, and document settings.
- Keep Export Sales persistence and numbering separate from domestic Sales.

### Billing Context

- Verify lists, overview totals, month summaries, reports, and numbering follow the selected company and accounting year.
- Avoid aggregating foreign-currency Export Sales into INR domestic Sales charts without an explicit conversion rule.

### Compliance And Delivery

- Harden GST gateway request/response logs, cancellation, retries, and validation.
- Keep exact-print PDF mail attachments retryable and remove temporary files only after successful delivery.
- Leave WhatsApp as a separate follow-up until a real dispatch provider is selected.

## Verification Needed

- Run server typecheck after backend changes.
- Run frontend typecheck after UI/client changes.
- Run frontend build after stock ledger or voucher UI changes.
- Smoke test Export Sales feature visibility in enabled and disabled states.
- Smoke test selected-company/accounting-year switching on Billing Overview and entry lists.
- Smoke test exact-print PDF email delivery and cleanup.
