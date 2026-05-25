import type { MasterDataModuleDefinition } from '../../../foundation/master-record/domain/value-objects/master-data-definition.js'

export const accountingYearCommonDefinition: MasterDataModuleDefinition = {
  key: 'accountingYear',
  label: 'Accounting Year',
  kind: 'common',
  tableName: 'accounting_years',
  idPrefix: 'accounting-year',
  group: 'others',
  defaultSortKey: 'name',
  columns: [
    { key: 'name', label: 'Name', type: 'string', required: true, nullable: false },
    { key: 'start_date', label: 'Start Date', type: 'date', required: true, nullable: false },
    { key: 'end_date', label: 'End Date', type: 'date', required: true, nullable: false },
    { key: 'books_start', label: 'Books Start', type: 'date', required: true, nullable: false },
    { key: 'is_current_year', label: 'Current Year', type: 'boolean', required: true, nullable: false },
  ],
}
