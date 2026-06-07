# ORDER

## Summary
Manages sales order and purchase order master data for tenant businesses. Uses the generic master-record CRUD pattern from foundation/master-record. Tracks order commitments from customers (sales orders) and to suppliers (purchase orders) with item-level detail, status tracking, and delivery scheduling.

## What We Done
- Sales order and purchase order CRUD using master-record pattern
- MasterRecordRepository-based generic list management with type field (sales/purchase) differentiation
- Multi-tenant data isolation via TenantContextService
- Item-level order line management (product, quantity, rate, tax)
- Order status tracking (draft, confirmed, shipped, delivered, cancelled)
- Delivery schedule and promised date tracking
- Tax and charge details at order level
- Party (customer/supplier) association with address and contact
- Database migration for order schema

## Gaps
- No order fulfillment tracking (picking, packing, shipping)
- No partial delivery against orders
- No automatic sales order to delivery note or invoice conversion
- No purchase order to goods receipt conversion
- No order revision/amendment workflow with versioning
- No backorder or drop-ship order handling
- No order approval workflow
- No inventory availability check at order entry

## Future Concepts
- Order fulfillment workflow with pick-pack-ship stages
- One-click order-to-invoice conversion with document generation
- Order revision history and amendment tracking
- Backorder management with automated restock suggestions
- Approval workflows for high-value or bulk orders
- Real-time inventory availability check during order creation
- Drop-ship order routing to suppliers
- Order status portal for customer self-service tracking
