import type { MasterDataModuleDefinition } from '../../../foundation/master-record/domain/value-objects/master-data-definition.js'

export const districtsCommonDefinition: MasterDataModuleDefinition = {
  key: 'districts',
  label: 'Districts',
  kind: 'common',
  tableName: 'common_districts',
  idPrefix: 'district',
  group: 'location',
  defaultSortKey: 'name',
  columns: [
    { key: 'name', label: 'Name', type: 'string', required: true, nullable: false },
    { key: 'state_id', label: 'State', type: 'number', numberMode: 'integer', required: true, nullable: false },
  ],
}
