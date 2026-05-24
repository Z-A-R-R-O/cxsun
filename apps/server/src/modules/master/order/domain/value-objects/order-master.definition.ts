import type { MasterDataModuleDefinition } from '../../../../foundation/master-record/domain/value-objects/master-data-definition.js'

export const orderMasterDefinition: MasterDataModuleDefinition = {
  key: 'orders',
  label: 'Work Orders',
  kind: 'master',
  tableName: 'masters_orders',
  defaultSortKey: 'name',
  idPrefix: 'order',
  group: 'orders',
  columns: [
    { key: 'code', label: 'Code', type: 'string', required: true, nullable: false },
    { key: 'name', label: 'Name', type: 'string', required: true, nullable: false },
    { key: 'description', label: 'Description', type: 'string', nullable: true },
  ],
}
