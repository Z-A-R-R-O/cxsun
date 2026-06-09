# Session Plan

**Date:** 2026-06-09  
**Version:** 1.0.89  
**Focus:** Tirupur Connect central marketplace and client publication flow.

## Objective

Make Tirupur Connect operate as a serious isolated marketplace tenant at `tirupurconnect.com`, while client workspaces use TC only to maintain and publish their own supplier/product identity. Marketplace transactions and collaboration data must stay in the central tenant and be accessed only through explicit APIs.

## Architecture Boundary

- Central marketplace tenant: `tirupur_connect`.
- Central domains: `tirupurconnect.com`, `www.tirupurconnect.com`, `tirupurconnect.local`.
- Central tenant owns RFQ, leads, messages, membership, analytics, events, news, buyer companies, review queues, and public marketplace listings.
- Client tenants own only source supplier/product profile records in their own tenant database.
- Client tenants publish supplier/product records to central marketplace tables through API.
- No internal cross-tenant transactions from client workflow screens. Cross-tenant movement happens only through publish/review APIs.

## Current Slice

Complete the public proof loop:

1. Client tenant creates supplier/product profile.
2. Client tenant publishes it by API.
3. Central marketplace team approves/rejects it.
4. `tirupurconnect.com` displays only approved supplier/product publications.

## Implementation Tasks

- Add public read-only marketplace APIs for approved suppliers/products.
- Query only central marketplace publication tables.
- Keep pending/rejected publications hidden from public APIs.
- Render approved suppliers/products on the TC public page.
- Preserve central/private authenticated APIs separately from public marketplace APIs.

## Verification

- `npm -w apps/server run typecheck`
- `npm -w apps/frontend run typecheck`
- `npm run test:tenant-static`
