import type { MasterDataModuleDefinition } from '../../../foundation/master-record/domain/value-objects/master-data-definition.js'

export const citiesCommonDefinition: MasterDataModuleDefinition = {
  key: 'cities',
  label: 'Cities',
  kind: 'common',
  tableName: 'common_cities',
  idPrefix: 'city',
  group: 'location',
  defaultSortKey: 'name',
  columns: [
    { key: 'name', label: 'Name', type: 'string', required: true, nullable: false },
    { key: 'district_id', label: 'District', type: 'number', numberMode: 'integer', required: true, nullable: false },
  ],
}
