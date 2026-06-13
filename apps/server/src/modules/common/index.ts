import { CountriesCommonModule } from './location/countries/index.js'
import { StatesCommonModule } from './location/states/index.js'
import { DistrictsCommonModule } from './location/districts/index.js'
import { CitiesCommonModule } from './location/cities/index.js'
import { PincodesCommonModule } from './location/pincodes/index.js'
import { ContactGroupsCommonModule } from './contacts/contact-groups/index.js'
import { ContactTypesCommonModule } from './contacts/contact-types/index.js'
import { AddressTypesCommonModule } from './contacts/address-types/index.js'
import { BankNamesCommonModule } from './contacts/bank-names/index.js'
import { ProductGroupsCommonModule } from './product/product-groups/index.js'
import { ProductCategoriesCommonModule } from './product/product-categories/index.js'
import { ProductTypesCommonModule } from './product/product-types/index.js'
import { UnitsCommonModule } from './product/units/index.js'
import { HsnCodesCommonModule } from './product/hsn-codes/index.js'
import { TaxesCommonModule } from './product/taxes/index.js'
import { BrandsCommonModule } from './product/brands/index.js'
import { ColoursCommonModule } from './product/colours/index.js'
import { SizesCommonModule } from './product/sizes/index.js'
import { CurrenciesCommonModule } from './others/currencies/index.js'
import { PrioritiesCommonModule } from './others/priorities/index.js'
import { OrderTypesCommonModule } from './orders/order-types/index.js'
import { StylesCommonModule } from './product/styles/index.js'
import { TransportsCommonModule } from './orders/transports/index.js'
import { WarehousesCommonModule } from './orders/warehouses/index.js'
import { DestinationsCommonModule } from './orders/destinations/index.js'
import { PaymentTermsCommonModule } from './others/payment-terms/index.js'
import { AccountingYearCommonModule } from './others/accounting-year/index.js'
import { MonthsCommonModule } from './others/months/index.js'
import { StockRejectionTypesCommonModule } from './orders/stock-rejection-types/index.js'
import { SalesAccountTypesCommonModule } from './others/sales-account-types/index.js'
import { migrateCountriesCommonTable } from './location/countries/index.js'
import { migrateStatesCommonTable } from './location/states/index.js'
import { migrateDistrictsCommonTable } from './location/districts/index.js'
import { migrateCitiesCommonTable } from './location/cities/index.js'
import { migratePincodesCommonTable } from './location/pincodes/index.js'
import { migrateContactGroupsCommonTable } from './contacts/contact-groups/index.js'
import { migrateContactTypesCommonTable } from './contacts/contact-types/index.js'
import { migrateAddressTypesCommonTable } from './contacts/address-types/index.js'
import { migrateBankNamesCommonTable } from './contacts/bank-names/index.js'
import { migrateProductGroupsCommonTable } from './product/product-groups/index.js'
import { migrateProductCategoriesCommonTable } from './product/product-categories/index.js'
import { migrateProductTypesCommonTable } from './product/product-types/index.js'
import { migrateUnitsCommonTable } from './product/units/index.js'
import { migrateHsnCodesCommonTable } from './product/hsn-codes/index.js'
import { migrateTaxesCommonTable } from './product/taxes/index.js'
import { migrateBrandsCommonTable } from './product/brands/index.js'
import { migrateColoursCommonTable } from './product/colours/index.js'
import { migrateSizesCommonTable } from './product/sizes/index.js'
import { migrateCurrenciesCommonTable } from './others/currencies/index.js'
import { migratePrioritiesCommonTable } from './others/priorities/index.js'
import { migrateOrderTypesCommonTable } from './orders/order-types/index.js'
import { migrateStylesCommonTable } from './product/styles/index.js'
import { migrateTransportsCommonTable } from './orders/transports/index.js'
import { migrateWarehousesCommonTable } from './orders/warehouses/index.js'
import { migrateDestinationsCommonTable } from './orders/destinations/index.js'
import { migratePaymentTermsCommonTable } from './others/payment-terms/index.js'
import { migrateAccountingYearCommonTable } from './others/accounting-year/index.js'
import { migrateMonthsCommonTable } from './others/months/index.js'
import { migrateStockRejectionTypesCommonTable } from './orders/stock-rejection-types/index.js'
import { migrateSalesAccountTypesCommonTable } from './others/sales-account-types/index.js'
import { seedCountriesCommonTable } from './location/countries/index.js'
import { seedStatesCommonTable } from './location/states/index.js'
import { seedDistrictsCommonTable } from './location/districts/index.js'
import { seedCitiesCommonTable } from './location/cities/index.js'
import { seedPincodesCommonTable } from './location/pincodes/index.js'
import { seedContactGroupsCommonTable } from './contacts/contact-groups/index.js'
import { seedContactTypesCommonTable } from './contacts/contact-types/index.js'
import { seedAddressTypesCommonTable } from './contacts/address-types/index.js'
import { seedBankNamesCommonTable } from './contacts/bank-names/index.js'
import { seedProductGroupsCommonTable } from './product/product-groups/index.js'
import { seedProductCategoriesCommonTable } from './product/product-categories/index.js'
import { seedProductTypesCommonTable } from './product/product-types/index.js'
import { seedUnitsCommonTable } from './product/units/index.js'
import { seedHsnCodesCommonTable } from './product/hsn-codes/index.js'
import { seedTaxesCommonTable } from './product/taxes/index.js'
import { seedBrandsCommonTable } from './product/brands/index.js'
import { seedColoursCommonTable } from './product/colours/index.js'
import { seedSizesCommonTable } from './product/sizes/index.js'
import { seedCurrenciesCommonTable } from './others/currencies/index.js'
import { seedPrioritiesCommonTable } from './others/priorities/index.js'
import { seedOrderTypesCommonTable } from './orders/order-types/index.js'
import { seedStylesCommonTable } from './product/styles/index.js'
import { seedTransportsCommonTable } from './orders/transports/index.js'
import { seedWarehousesCommonTable } from './orders/warehouses/index.js'
import { seedDestinationsCommonTable } from './orders/destinations/index.js'
import { seedPaymentTermsCommonTable } from './others/payment-terms/index.js'
import { seedAccountingYearCommonTable } from './others/accounting-year/index.js'
import { seedMonthsCommonTable } from './others/months/index.js'
import { seedStockRejectionTypesCommonTable } from './orders/stock-rejection-types/index.js'
import { seedSalesAccountTypesCommonTable } from './others/sales-account-types/index.js'
import type { Kysely } from 'kysely'
import type { TenantDatabaseSchema } from '../../infrastructure/tenant-database/tenant-database.schema.js'

export { commonModuleDefinitions, commonModuleFolderContracts } from './registry.js'

export const commonModuleClasses = [
  CountriesCommonModule,
  StatesCommonModule,
  DistrictsCommonModule,
  CitiesCommonModule,
  PincodesCommonModule,
  ContactGroupsCommonModule,
  ContactTypesCommonModule,
  AddressTypesCommonModule,
  BankNamesCommonModule,
  ProductGroupsCommonModule,
  ProductCategoriesCommonModule,
  ProductTypesCommonModule,
  UnitsCommonModule,
  HsnCodesCommonModule,
  TaxesCommonModule,
  BrandsCommonModule,
  ColoursCommonModule,
  SizesCommonModule,
  CurrenciesCommonModule,
  PrioritiesCommonModule,
  OrderTypesCommonModule,
  StylesCommonModule,
  TransportsCommonModule,
  WarehousesCommonModule,
  DestinationsCommonModule,
  PaymentTermsCommonModule,
  AccountingYearCommonModule,
  MonthsCommonModule,
  StockRejectionTypesCommonModule,
  SalesAccountTypesCommonModule,
]

export async function migrateCommonModuleTables(database: Kysely<TenantDatabaseSchema>) {
  await migrateCountriesCommonTable(database)
  await migrateStatesCommonTable(database)
  await migrateDistrictsCommonTable(database)
  await migrateCitiesCommonTable(database)
  await migratePincodesCommonTable(database)
  await migrateContactGroupsCommonTable(database)
  await migrateContactTypesCommonTable(database)
  await migrateAddressTypesCommonTable(database)
  await migrateBankNamesCommonTable(database)
  await migrateProductGroupsCommonTable(database)
  await migrateProductCategoriesCommonTable(database)
  await migrateProductTypesCommonTable(database)
  await migrateUnitsCommonTable(database)
  await migrateHsnCodesCommonTable(database)
  await migrateTaxesCommonTable(database)
  await migrateBrandsCommonTable(database)
  await migrateColoursCommonTable(database)
  await migrateSizesCommonTable(database)
  await migrateCurrenciesCommonTable(database)
  await migratePrioritiesCommonTable(database)
  await migrateOrderTypesCommonTable(database)
  await migrateStylesCommonTable(database)
  await migrateTransportsCommonTable(database)
  await migrateWarehousesCommonTable(database)
  await migrateDestinationsCommonTable(database)
  await migratePaymentTermsCommonTable(database)
  await migrateAccountingYearCommonTable(database)
  await migrateMonthsCommonTable(database)
  await migrateStockRejectionTypesCommonTable(database)
  await migrateSalesAccountTypesCommonTable(database)
}

export async function seedCommonModuleTables(database: Kysely<TenantDatabaseSchema>) {
  await seedCountriesCommonTable(database)
  await seedStatesCommonTable(database)
  await seedDistrictsCommonTable(database)
  await seedCitiesCommonTable(database)
  await seedPincodesCommonTable(database)
  await seedContactGroupsCommonTable(database)
  await seedContactTypesCommonTable(database)
  await seedAddressTypesCommonTable(database)
  await seedBankNamesCommonTable(database)
  await seedProductGroupsCommonTable(database)
  await seedProductCategoriesCommonTable(database)
  await seedProductTypesCommonTable(database)
  await seedUnitsCommonTable(database)
  await seedHsnCodesCommonTable(database)
  await seedTaxesCommonTable(database)
  await seedBrandsCommonTable(database)
  await seedColoursCommonTable(database)
  await seedSizesCommonTable(database)
  await seedCurrenciesCommonTable(database)
  await seedPrioritiesCommonTable(database)
  await seedOrderTypesCommonTable(database)
  await seedStylesCommonTable(database)
  await seedTransportsCommonTable(database)
  await seedWarehousesCommonTable(database)
  await seedDestinationsCommonTable(database)
  await seedPaymentTermsCommonTable(database)
  await seedAccountingYearCommonTable(database)
  await seedMonthsCommonTable(database)
  await seedStockRejectionTypesCommonTable(database)
  await seedSalesAccountTypesCommonTable(database)
}
