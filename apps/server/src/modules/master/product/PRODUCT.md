# PRODUCT

## Summary
Manages product and service master data for tenant businesses. Uses the generic master-record CRUD pattern from foundation/master-record. Supports product variants, units of measure, tax rates, pricing, and stock tracking configuration.

## What We Done
- Product CRUD using master-record pattern
- MasterRecordRepository-based generic list management with type field (product/service) differentiation
- Multi-tenant data isolation via TenantContextService
- Product categorization and grouping
- Unit of measure (UOM) management
- Tax rate configuration per product (GST rate, HSN code)
- Pricing management (sales price, purchase price, MRP)
- Stock tracking enable/disable per product
- Product variant support (size, color, etc.)
- HSN/SAC code assignment for GST compliance
- Database migration for product schema

## Gaps
- No product image/media gallery management
- No barcode/SKU generation and validation
- No product bundle or kit assembly support
- No inventory reorder point configuration per product
- No product-specific discount or promotion rules
- No product attribute system for dynamic properties
- No product cost history tracking

## Future Concepts
- Product media gallery with image management and variants
- Auto barcode and SKU generation with printing
- Product bundling and kit assembly with component tracking
- Reorder level settings per product with automated alerts
- Promotional pricing and discount schedule management
- Dynamic product attributes with custom field support
- Product cost history with landed cost updates
- Integration with stock ledger for real-time inventory visibility
