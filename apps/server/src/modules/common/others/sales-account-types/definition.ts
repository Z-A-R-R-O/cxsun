import type { MasterDataModuleDefinition } from '../../../foundation/master-record/domain/value-objects/master-data-definition.js'

export const salesAccountTypesCommonDefinition: MasterDataModuleDefinition = {
  key: 'salesAccountTypes',
  label: 'Sales Types',
  kind: 'common',
  tableName: 'common_sales_account_types',
  idPrefix: 'sales-account-type',
  group: 'others',
  defaultSortKey: 'name',
  columns: [
    { key: 'name', label: 'Name', type: 'string', required: true, nullable: false },
    { key: 'description', label: 'Description', type: 'string', nullable: true },
  ],
}
