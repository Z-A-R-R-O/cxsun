# GST

## Summary
Global GSP credential management, tenant-level GST compliance settings, and an interactive sandbox for testing WhiteBooks GST API operations (authentication, e-invoice, e-way bill).

## What We Done
- `gst-provider-settings-page.tsx` — Global WhiteBooks GSP credentials management. Tabs for sandbox/production environments. Per-purpose cards (e-invoice+e-way, e-way only) with fields: registered email, client ID, client secret, IP address, base URL. Enable/disable toggle per purpose. Save and refresh.
- `gst-sandbox-page.tsx` — GST compliance test sandbox. Two modes: simple (handshake — authenticate + GSTIN lookup) and advanced (super-admin with tenant selector, run individual/selected/all operations). Provider settings section (username, password, GSTIN, environment select). Token status tiles (has token, preview, expiry balance). Operation list with per-op result indicators. Per-operation JSON editors for query, payload, and source. Result viewer with formatted JSON. Recent calls history. IRN chaining (auto-fills IRN-dependent operations on successful `generateIrn`). Sample invoice payload with auto-incrementing document number.
- `gst-compliance-client.ts` — `runGstComplianceOperation`, `getGstComplianceTokenStatus`, `getGstComplianceSettings`, `saveGstComplianceSettings`, `getGstProviderGlobalSettings`, `saveGstProviderGlobalSettings`, `listGstComplianceOperations`. Types: `GstComplianceOperation`, `GstComplianceSettings`, `GstProviderGlobalSettings`, `GstComplianceTokenStatus`, `GstComplianceOperationRecord`, `GstComplianceDocument`.

## Gaps
- Hardcoded to WhiteBooks provider — no multi-GSP support.
- Sandbox is manual test interface only — no automated test runner.
- No tenant GST configuration dashboard (billing, filing periods).
- No GST return filing integration (GSTR-1, GSTR-3B).

## Future Concepts
- Multi-GSP provider support with pluggable adapters.
- Automated GST compliance monitoring (IRN generation status).
- GST return filing workflow with data aggregation.
- E-way bill expiration alerts and extension workflow.
