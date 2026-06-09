# Session Plan

**Date:** 2026-06-09  
**Version:** 1.0.90  
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

Complete public marketplace discovery:

1. `tirupurconnect.com` lists approved supplier/product publications.
2. Public users can open supplier/product detail pages.
3. Public users can browse open RFQs from the central marketplace tenant.
4. Public users can submit supplier/product/RFQ inquiries into central marketplace tables.

## Implementation Tasks

- Add public read-only marketplace APIs for approved suppliers/products and open RFQs.
- Query only central marketplace publication tables.
- Keep pending/rejected publications hidden from public APIs.
- Render approved suppliers/products/RFQs on the TC public page.
- Add public detail pages and inquiry capture.
- Preserve central/private authenticated APIs separately from public marketplace APIs.

## Verification

- `npm -w apps/server run typecheck`
- `npm -w apps/frontend run typecheck`
- `npm run test:tenant-static`
