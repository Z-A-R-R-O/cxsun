# DELIVERYNOTE

## Summary
Handles outward stock delivery (dispatch) processing for tenant businesses. Records goods delivered to customers with item-level detail. Follows DDD with domain aggregates, application services, infrastructure repositories, and HTTP controllers. Integrates with stock ledger for inventory deduction.

## What We Done
- Delivery note CRUD with item-level stock deduction (quantity, rate, batch/serial details)
- Multi-tenant data isolation via TenantContextService with 'company.manage' permission scope
- Auto-numbering via DocumentNumberRepository
- Event-driven lifecycle with events (created, updated, deleted)
- Master queue service integration for event publishing
- Nested CRUD for delivery items and stock allocations
- Soft-delete support
- TypeORM repository pattern with tenant-scoped queries
- Database migration for delivery note schema
- Integration with stock ledger for inventory value deduction

## Gaps
- No sales order matching (delivery against SO)
- No delivery challan printing or e-waybill generation
- No shipment tracking or courier integration
- No serial/batch number issue tracking
- No partial delivery handling
- No delivery confirmation workflow with POD (Proof of Delivery)

## Future Concepts
- SO-based delivery with pick-pack-ship workflow
- E-way bill generation via GSP provider integration
- Courier/LSP integration for shipment tracking
- POD capture and delivery confirmation
- Serial number issue tracking with barcode scanning
- Delivery route planning and dispatch scheduling
