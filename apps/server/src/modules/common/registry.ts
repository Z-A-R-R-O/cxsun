import { countriesCommonDefinition } from './location/countries/definition.js'
import { statesCommonDefinition } from './location/states/definition.js'
import { districtsCommonDefinition } from './location/districts/definition.js'
import { citiesCommonDefinition } from './location/cities/definition.js'
import { pincodesCommonDefinition } from './location/pincodes/definition.js'
import { contactGroupsCommonDefinition } from './contacts/contact-groups/definition.js'
import { contactTypesCommonDefinition } from './contacts/contact-types/definition.js'
import { addressTypesCommonDefinition } from './contacts/address-types/definition.js'
import { bankNamesCommonDefinition } from './contacts/bank-names/definition.js'
import { productGroupsCommonDefinition } from './product/product-groups/definition.js'
import { productCategoriesCommonDefinition } from './product/product-categories/definition.js'
import { productTypesCommonDefinition } from './product/product-types/definition.js'
import { unitsCommonDefinition } from './product/units/definition.js'
import { hsnCodesCommonDefinition } from './product/hsn-codes/definition.js'
import { taxesCommonDefinition } from './product/taxes/definition.js'
import { brandsCommonDefinition } from './product/brands/definition.js'
import { coloursCommonDefinition } from './product/colours/definition.js'
import { sizesCommonDefinition } from './product/sizes/definition.js'
import { currenciesCommonDefinition } from './others/currencies/definition.js'
import { prioritiesCommonDefinition } from './others/priorities/definition.js'
import { orderTypesCommonDefinition } from './orders/order-types/definition.js'
import { stylesCommonDefinition } from './product/styles/definition.js'
import { transportsCommonDefinition } from './orders/transports/definition.js'
import { warehousesCommonDefinition } from './orders/warehouses/definition.js'
import { destinationsCommonDefinition } from './orders/destinations/definition.js'
import { paymentTermsCommonDefinition } from './others/payment-terms/definition.js'
import { accountingYearCommonDefinition } from './others/accounting-year/definition.js'
import { monthsCommonDefinition } from './others/months/definition.js'
import { stockRejectionTypesCommonDefinition } from './orders/stock-rejection-types/definition.js'
import { salesAccountTypesCommonDefinition } from './others/sales-account-types/definition.js'
import type { MasterDataModuleDefinition } from '../foundation/master-record/domain/value-objects/master-data-definition.js'

export const commonModuleDefinitions: MasterDataModuleDefinition[] = [
  countriesCommonDefinition,
  statesCommonDefinition,
  districtsCommonDefinition,
  citiesCommonDefinition,
  pincodesCommonDefinition,
  contactGroupsCommonDefinition,
  contactTypesCommonDefinition,
  addressTypesCommonDefinition,
  bankNamesCommonDefinition,
  productGroupsCommonDefinition,
  productCategoriesCommonDefinition,
  productTypesCommonDefinition,
  unitsCommonDefinition,
  hsnCodesCommonDefinition,
  taxesCommonDefinition,
  brandsCommonDefinition,
  coloursCommonDefinition,
  sizesCommonDefinition,
  currenciesCommonDefinition,
  prioritiesCommonDefinition,
  orderTypesCommonDefinition,
  stylesCommonDefinition,
  transportsCommonDefinition,
  warehousesCommonDefinition,
  destinationsCommonDefinition,
  paymentTermsCommonDefinition,
  accountingYearCommonDefinition,
  monthsCommonDefinition,
  stockRejectionTypesCommonDefinition,
  salesAccountTypesCommonDefinition,
]

export const commonModuleFolderContracts = [
  { key: 'countries', group: 'location', module: 'countries', moduleClass: 'CountriesCommonModule', migration: 'migrateCountriesCommonTable' },
  { key: 'states', group: 'location', module: 'states', moduleClass: 'StatesCommonModule', migration: 'migrateStatesCommonTable' },
  { key: 'districts', group: 'location', module: 'districts', moduleClass: 'DistrictsCommonModule', migration: 'migrateDistrictsCommonTable' },
  { key: 'cities', group: 'location', module: 'cities', moduleClass: 'CitiesCommonModule', migration: 'migrateCitiesCommonTable' },
  { key: 'pincodes', group: 'location', module: 'pincodes', moduleClass: 'PincodesCommonModule', migration: 'migratePincodesCommonTable' },
  { key: 'contactGroups', group: 'contacts', module: 'contact-groups', moduleClass: 'ContactGroupsCommonModule', migration: 'migrateContactGroupsCommonTable' },
  { key: 'contactTypes', group: 'contacts', module: 'contact-types', moduleClass: 'ContactTypesCommonModule', migration: 'migrateContactTypesCommonTable' },
  { key: 'addressTypes', group: 'contacts', module: 'address-types', moduleClass: 'AddressTypesCommonModule', migration: 'migrateAddressTypesCommonTable' },
  { key: 'bankNames', group: 'contacts', module: 'bank-names', moduleClass: 'BankNamesCommonModule', migration: 'migrateBankNamesCommonTable' },
  { key: 'productGroups', group: 'product', module: 'product-groups', moduleClass: 'ProductGroupsCommonModule', migration: 'migrateProductGroupsCommonTable' },
  { key: 'productCategories', group: 'product', module: 'product-categories', moduleClass: 'ProductCategoriesCommonModule', migration: 'migrateProductCategoriesCommonTable' },
  { key: 'productTypes', group: 'product', module: 'product-types', moduleClass: 'ProductTypesCommonModule', migration: 'migrateProductTypesCommonTable' },
  { key: 'units', group: 'product', module: 'units', moduleClass: 'UnitsCommonModule', migration: 'migrateUnitsCommonTable' },
  { key: 'hsnCodes', group: 'product', module: 'hsn-codes', moduleClass: 'HsnCodesCommonModule', migration: 'migrateHsnCodesCommonTable' },
  { key: 'taxes', group: 'product', module: 'taxes', moduleClass: 'TaxesCommonModule', migration: 'migrateTaxesCommonTable' },
  { key: 'brands', group: 'product', module: 'brands', moduleClass: 'BrandsCommonModule', migration: 'migrateBrandsCommonTable' },
  { key: 'colours', group: 'product', module: 'colours', moduleClass: 'ColoursCommonModule', migration: 'migrateColoursCommonTable' },
  { key: 'sizes', group: 'product', module: 'sizes', moduleClass: 'SizesCommonModule', migration: 'migrateSizesCommonTable' },
  { key: 'currencies', group: 'others', module: 'currencies', moduleClass: 'CurrenciesCommonModule', migration: 'migrateCurrenciesCommonTable' },
  { key: 'priorities', group: 'others', module: 'priorities', moduleClass: 'PrioritiesCommonModule', migration: 'migratePrioritiesCommonTable' },
  { key: 'orderTypes', group: 'orders', module: 'order-types', moduleClass: 'OrderTypesCommonModule', migration: 'migrateOrderTypesCommonTable' },
  { key: 'styles', group: 'product', module: 'styles', moduleClass: 'StylesCommonModule', migration: 'migrateStylesCommonTable' },
  { key: 'transports', group: 'orders', module: 'transports', moduleClass: 'TransportsCommonModule', migration: 'migrateTransportsCommonTable' },
  { key: 'warehouses', group: 'orders', module: 'warehouses', moduleClass: 'WarehousesCommonModule', migration: 'migrateWarehousesCommonTable' },
  { key: 'destinations', group: 'orders', module: 'destinations', moduleClass: 'DestinationsCommonModule', migration: 'migrateDestinationsCommonTable' },
  { key: 'paymentTerms', group: 'others', module: 'payment-terms', moduleClass: 'PaymentTermsCommonModule', migration: 'migratePaymentTermsCommonTable' },
  { key: 'accountingYear', group: 'others', module: 'accounting-year', moduleClass: 'AccountingYearCommonModule', migration: 'migrateAccountingYearCommonTable' },
  { key: 'months', group: 'others', module: 'months', moduleClass: 'MonthsCommonModule', migration: 'migrateMonthsCommonTable' },
  { key: 'stockRejectionTypes', group: 'orders', module: 'stock-rejection-types', moduleClass: 'StockRejectionTypesCommonModule', migration: 'migrateStockRejectionTypesCommonTable' },
  { key: 'salesAccountTypes', group: 'others', module: 'sales-account-types', moduleClass: 'SalesAccountTypesCommonModule', migration: 'migrateSalesAccountTypesCommonTable' },
] as const
