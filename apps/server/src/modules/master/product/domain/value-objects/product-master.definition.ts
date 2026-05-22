import type { MasterDataModuleDefinition } from '../../../../foundation/master-record/domain/value-objects/master-data-definition.js'

export const productMasterDefinition: MasterDataModuleDefinition = {
  key: 'products',
  label: 'Products',
  kind: 'master',
  tableName: 'masters_products',
  defaultSortKey: 'name',
  idPrefix: 'product',
  group: 'product',
  columns: [
    { key: 'code', label: 'Code', type: 'string', required: true, nullable: false },
    { key: 'name', label: 'Name', type: 'string', required: true, nullable: false },
    { key: 'product_group_id', label: 'Product Group', type: 'number', numberMode: 'integer', nullable: true },
    { key: 'product_category_id', label: 'Category', type: 'number', numberMode: 'integer', nullable: true },
    { key: 'product_type_id', label: 'Product Type', type: 'number', numberMode: 'integer', nullable: true },
    { key: 'hsn_code_id', label: 'HSN Code', type: 'number', numberMode: 'integer', nullable: true },
    { key: 'brand_id', label: 'Brand', type: 'number', numberMode: 'integer', nullable: true },
    { key: 'colour_id', label: 'Colour', type: 'number', numberMode: 'integer', nullable: true },
    { key: 'size_id', label: 'Size', type: 'number', numberMode: 'integer', nullable: true },
    { key: 'unit_id', label: 'Unit', type: 'number', numberMode: 'integer', nullable: true },
    { key: 'tax_id', label: 'Tax', type: 'number', numberMode: 'integer', nullable: true },
    { key: 'style_id', label: 'Style', type: 'number', numberMode: 'integer', nullable: true },
    { key: 'description', label: 'Description', type: 'string', nullable: true },
  ],
}
