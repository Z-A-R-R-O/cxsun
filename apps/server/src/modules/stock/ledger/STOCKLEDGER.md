# STOCKLEDGER

## Summary
Manages the stock ledger for inventory valuation and tracking. Records all stock movements (inward, outward, adjustments) with quantity and value changes. Follows DDD with domain aggregates, application services, infrastructure repositories, and HTTP controllers. Supports serial/batch number tracking and configurable stock settings.

## What We Done
- Stock ledger CRUD for tracking inventory movements with quantity and rate
- Multi-tenant data isolation via TenantContextService with 'company.manage' permission scope
- Auto-numbering via DocumentNumberRepository
- Event-driven lifecycle with events (created, updated, deleted, stock-adjusted)
- Master queue service integration for event publishing
- Serial number tracking across stock items
- Batch/lot number tracking with expiry date support
- Barcode generation and tracking
- Stock settings configuration (valuation method, serial/batch preferences)
- Stock adjustment entries for manual corrections
- TypeORM repository pattern with tenant-scoped queries
- Database migration for stock ledger schema

## Gaps
- No FIFO/WAC (Weighted Average Cost) valuation engine for COGS computation
- No stock reorder level alerts or low-stock notifications
- No physical stock count / inventory audit workflow
- No multi-warehouse location tracking
- No stock transfer between warehouses
- No expiry date-based batch tracking for perishable goods
- No negative stock prevention or warnings

## Future Concepts
- Automated FIFO/WAC cost calculation for outgoing stock valuation
- Reorder point monitoring with automated purchase suggestion
- Physical inventory count with variance analysis
- Multi-warehouse and bin location management
- Inter-warehouse stock transfer workflow
- Expiry tracking and near-expiry alerts
- Stock valuation reports (inventory aging, movement analysis)
- Integration with barcode/RFID scanning for real-time updates
