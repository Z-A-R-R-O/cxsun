import type { MasterDataModuleDefinition } from '../../../foundation/master-record/domain/value-objects/master-data-definition.js'

export const hsnCodesCommonDefinition: MasterDataModuleDefinition = {
  key: 'hsnCodes',
  label: 'HSN Codes',
  kind: 'common',
  tableName: 'common_hsn_codes',
  idPrefix: 'hsn',
  group: 'product',
  defaultSortKey: 'code',
  columns: [
    { key: 'code', label: 'HSN Code', type: 'string', required: true, nullable: false },
    { key: 'description', label: 'Description', type: 'string', required: true, nullable: false },
  ],
}
