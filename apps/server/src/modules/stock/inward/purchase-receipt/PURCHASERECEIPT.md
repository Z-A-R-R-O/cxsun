# PURCHASERECEIPT

## Summary
Handles inward stock receipt processing for tenant businesses. Records goods received from suppliers against purchase documents with item-level detail. Follows DDD with domain aggregates, application services, infrastructure repositories, and HTTP controllers. Integrates with stock ledger for inventory updates.

## What We Done
- Purchase receipt CRUD with item-level stock tracking (quantity, rate, batch/serial details)
- Multi-tenant data isolation via TenantContextService with 'company.manage' permission scope
- Auto-numbering via DocumentNumberRepository
- Event-driven lifecycle with events (created, updated, deleted)
- Master queue service integration for event publishing
- Nested CRUD for receipt items and stock allocations
- Soft-delete support
- TypeORM repository pattern with tenant-scoped queries
- Database migration for purchase receipt schema
- Integration with stock ledger for inventory value updates

## Gaps
- No purchase order matching (goods receipt vs PO)
- No quality inspection workflow at receipt
- No serial/batch number enforcement or validation
- No landed cost distribution at receipt time
- No return-to-supplier (RMA) workflow
- No partial receipt handling across multiple shipments

## Future Concepts
- PO-based goods receipt with three-way matching (PO, receipt, invoice)
- Quality check workflow with pass/fail/reject status
- Serial number and batch tracking with barcode scanning
- Landed cost allocation at goods receipt
- Supplier return and debit note workflow
- GRN (Goods Receipt Note) printing and document generation
