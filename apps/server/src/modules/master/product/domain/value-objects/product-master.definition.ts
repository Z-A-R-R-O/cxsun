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
    { key: 'product_type_id', label: 'Product Type', type: 'number', numberMode: 'integer', nullable: true },
    { key: 'hsn_code_id', label: 'HSN Code', type: 'number', numberMode: 'integer', nullable: true },
    { key: 'unit_id', label: 'Unit', type: 'number', numberMode: 'integer', nullable: true },
    { key: 'tax_id', label: 'Tax', type: 'number', numberMode: 'integer', nullable: true },
  ],
}
