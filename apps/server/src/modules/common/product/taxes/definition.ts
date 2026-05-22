import type { MasterDataModuleDefinition } from '../../../foundation/master-record/domain/value-objects/master-data-definition.js'

export const taxesCommonDefinition: MasterDataModuleDefinition = {
  key: 'taxes',
  label: 'Taxes',
  kind: 'common',
  tableName: 'common_taxes',
  idPrefix: 'tax',
  group: 'product',
  defaultSortKey: 'rate_percent',
  columns: [
    { key: 'rate_percent', label: 'Tax %', type: 'number', numberMode: 'decimal', required: true, nullable: false },
    { key: 'description', label: 'Description', type: 'string', required: true, nullable: false },
  ],
}
