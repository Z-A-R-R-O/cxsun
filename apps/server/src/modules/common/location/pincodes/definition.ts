import type { MasterDataModuleDefinition } from '../../../foundation/master-record/domain/value-objects/master-data-definition.js'

export const pincodesCommonDefinition: MasterDataModuleDefinition = {
  key: 'pincodes',
  label: 'Pincodes',
  kind: 'common',
  tableName: 'common_pincodes',
  idPrefix: 'pincode',
  group: 'location',
  defaultSortKey: 'name',
  columns: [
    { key: 'name', label: 'Pincode Number', type: 'string', required: true, nullable: false },
    { key: 'city_id', label: 'City', type: 'number', numberMode: 'integer', required: true, nullable: false },
  ],
}
