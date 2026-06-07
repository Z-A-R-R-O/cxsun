import type { Generated } from 'kysely'

export interface TenantCompaniesTable {
  id: Generated<number>
  uuid: string
  tenant_id: number
  industry_id: number
  code: string
  name: string
  legal_name: string | null
  tagline: string | null
  short_about: string | null
  gstin_uin: string | null
  pan: string | null
  date_of_incorporation: string | null
  msme_no: string | null
  msme_category: string | null
  tan: string | null
  tds_available: boolean
  tds_section: string | null
  tds_rate_percent: number | null
  tcs_available: boolean
  tcs_section: string | null
  tcs_rate_percent: number | null
  website: string | null
  description: string | null
  primary_email: string | null
  primary_phone: string | null
  is_primary: boolean
  is_active: boolean
  status: string
  settings: string
  features: string
  created_at: Generated<Date>
  updated_at: Generated<Date>
  deleted_at: Date | null
}

export interface TenantAccountingYearsTable {
  id: Generated<number>
  uuid: string
  name: string
  start_date: string
  end_date: string
  books_start: string
  is_current_year: boolean
  is_active: boolean
  created_at: Generated<Date>
  updated_at: Generated<Date>
  deleted_at: Date | null
}

export interface TenantDefaultCompaniesTable {
  id: Generated<number>
  uuid: string
  tenant_id: number
  industry_id: number
  company_id: number
  accounting_year_id: number
  landing_app: string
  is_active: boolean
  created_at: Generated<Date>
  updated_at: Generated<Date>
}

export interface TenantCompanyLogosTable {
  id: Generated<number>
  uuid: string
  company_id: number
  logo_url: string
  logo_type: string
  is_active: boolean
  created_at: Generated<Date>
  updated_at: Generated<Date>
}

export interface TenantAddressBookTable {
  id: Generated<number>
  uuid: string
  owner_type: string
  owner_id: number
  address_type_id: string | null
  address_line1: string
  address_line2: string | null
  city_id: string | null
  district_id: string | null
  state_id: string | null
  country_id: string | null
  pincode_id: string | null
  latitude: number | null
  longitude: number | null
  is_default: boolean
  is_active: boolean
  created_at: Generated<Date>
  updated_at: Generated<Date>
}

export interface TenantCompanyEmailsTable {
  id: Generated<number>
  uuid: string
  company_id: number
  email: string
  email_type: string
  is_active: boolean
  created_at: Generated<Date>
  updated_at: Generated<Date>
}

export interface TenantCompanyPhonesTable {
  id: Generated<number>
  uuid: string
  company_id: number
  phone_number: string
  phone_type: string
  is_primary: boolean
  is_active: boolean
  created_at: Generated<Date>
  updated_at: Generated<Date>
}

export interface TenantContactEmailsTable {
  id: Generated<number>
  uuid: string
  contact_id: number
  email: string
  email_type: string
  is_primary: boolean
  is_active: boolean
  created_at: Generated<Date>
  updated_at: Generated<Date>
}

export interface TenantContactPhonesTable {
  id: Generated<number>
  uuid: string
  contact_id: number
  phone_number: string
  phone_type: string
  is_primary: boolean
  is_active: boolean
  created_at: Generated<Date>
  updated_at: Generated<Date>
}

export interface TenantContactSocialLinksTable {
  id: Generated<number>
  uuid: string
  contact_id: number
  platform: string
  url: string
  is_active: boolean
  created_at: Generated<Date>
  updated_at: Generated<Date>
}

export interface TenantContactBankAccountsTable {
  id: Generated<number>
  uuid: string
  contact_id: number
  bank_name: string
  account_number: string
  account_holder_name: string
  ifsc: string
  branch: string | null
  is_primary: boolean
  is_active: boolean
  created_at: Generated<Date>
  updated_at: Generated<Date>
}

export interface TenantContactGstDetailsTable {
  id: Generated<number>
  uuid: string
  contact_id: number
  gstin: string
  state: string
  is_default: boolean
  is_active: boolean
  created_at: Generated<Date>
  updated_at: Generated<Date>
}

export interface TenantCompanySocialLinksTable {
  id: Generated<number>
  uuid: string
  company_id: number
  platform: string
  url: string
  is_active: boolean
  created_at: Generated<Date>
  updated_at: Generated<Date>
}

export interface TenantCompanyBankAccountsTable {
  id: Generated<number>
  uuid: string
  company_id: number
  bank_name: string
  account_number: string
  account_holder_name: string
  ifsc: string
  branch: string | null
  qr_image_url: string | null
  is_primary: boolean
  is_active: boolean
  created_at: Generated<Date>
  updated_at: Generated<Date>
}

export interface TenantRbacRolesTable {
  id: Generated<number>
  uuid: string
  code: string
  name: string
  settings: string
  created_at: Generated<Date>
  updated_at: Generated<Date>
}

export interface TenantRbacPoliciesTable {
  id: Generated<number>
  uuid: string
  code: string
  name: string
  description: string
  created_at: Generated<Date>
}

export interface TenantRbacRolePoliciesTable {
  id: Generated<number>
  uuid: string
  role_code: string
  policy_code: string
  created_at: Generated<Date>
}

export interface TenantUsersTable {
  id: Generated<number>
  uuid: string
  name: string
  email: string
  password_hash: string
  status: string
  created_at: Generated<Date>
  updated_at: Generated<Date>
}

export interface TenantUserTenantsTable {
  id: Generated<number>
  uuid: string
  user_id: number
  role: string
  status: string
  created_at: Generated<Date>
  updated_at: Generated<Date>
}

export interface TenantCommonCountriesTable {
  id: Generated<number>
  uuid: string
  code: string
  name: string
  phone_code: string | null
  is_active: boolean
  created_at: Generated<Date>
  updated_at: Generated<Date>
  deleted_at: Date | null
}

export interface TenantCommonStatesTable {
  id: Generated<number>
  uuid: string
  country_id: number
  code: string
  name: string
  is_active: boolean
  created_at: Generated<Date>
  updated_at: Generated<Date>
  deleted_at: Date | null
}

export interface TenantCommonDistrictsTable {
  id: Generated<number>
  uuid: string
  state_id: number
  code: string
  name: string
  is_active: boolean
  created_at: Generated<Date>
  updated_at: Generated<Date>
  deleted_at: Date | null
}

export interface TenantCommonCitiesTable {
  id: Generated<number>
  uuid: string
  state_id: number
  district_id: number
  code: string
  name: string
  is_active: boolean
  created_at: Generated<Date>
  updated_at: Generated<Date>
  deleted_at: Date | null
}

export interface TenantCommonPincodesTable {
  id: Generated<number>
  uuid: string
  country_id: number
  state_id: number
  district_id: number
  city_id: number
  code: string
  area_name: string | null
  is_active: boolean
  created_at: Generated<Date>
  updated_at: Generated<Date>
  deleted_at: Date | null
}

export interface TenantCommonContactGroupsTable {
  id: Generated<number>
  uuid: string
  code: string
  name: string
  description: string | null
  is_active: boolean
  created_at: Generated<Date>
  updated_at: Generated<Date>
  deleted_at: Date | null
}

export interface TenantCommonContactTypesTable {
  id: Generated<number>
  uuid: string
  code: string
  name: string
  description: string | null
  is_active: boolean
  created_at: Generated<Date>
  updated_at: Generated<Date>
  deleted_at: Date | null
}

export interface TenantCommonAddressTypesTable {
  id: Generated<number>
  uuid: string
  code: string
  name: string
  description: string | null
  is_active: boolean
  created_at: Generated<Date>
  updated_at: Generated<Date>
  deleted_at: Date | null
}

export interface TenantCommonBankNamesTable {
  id: Generated<number>
  uuid: string
  code: string
  name: string
  description: string | null
  is_active: boolean
  created_at: Generated<Date>
  updated_at: Generated<Date>
  deleted_at: Date | null
}

export interface TenantCommonProductGroupsTable {
  id: Generated<number>
  uuid: string
  code: string
  name: string
  description: string | null
  is_active: boolean
  created_at: Generated<Date>
  updated_at: Generated<Date>
  deleted_at: Date | null
}

export interface TenantCommonProductCategoriesTable {
  id: Generated<number>
  uuid: string
  code: string
  name: string
  description: string | null
  image: string | null
  position_order: number | null
  show_on_storefront_top_menu: boolean
  show_on_storefront_catalog: boolean
  is_active: boolean
  created_at: Generated<Date>
  updated_at: Generated<Date>
  deleted_at: Date | null
}

export interface TenantCommonProductTypesTable {
  id: Generated<number>
  uuid: string
  code: string
  name: string
  description: string | null
  is_active: boolean
  created_at: Generated<Date>
  updated_at: Generated<Date>
  deleted_at: Date | null
}

export interface TenantCommonUnitsTable {
  id: Generated<number>
  uuid: string
  code: string
  name: string
  symbol: string | null
  description: string | null
  is_active: boolean
  created_at: Generated<Date>
  updated_at: Generated<Date>
  deleted_at: Date | null
}

export interface TenantCommonHsnCodesTable {
  id: Generated<number>
  uuid: string
  code: string
  name: string
  description: string
  is_active: boolean
  created_at: Generated<Date>
  updated_at: Generated<Date>
  deleted_at: Date | null
}

export interface TenantCommonTaxesTable {
  id: Generated<number>
  uuid: string
  rate_percent: number
  description: string
  is_active: boolean
  created_at: Generated<Date>
  updated_at: Generated<Date>
  deleted_at: Date | null
}

export interface TenantCommonBrandsTable {
  id: Generated<number>
  uuid: string
  code: string
  name: string
  description: string | null
  is_active: boolean
  created_at: Generated<Date>
  updated_at: Generated<Date>
  deleted_at: Date | null
}

export interface TenantCommonColoursTable {
  id: Generated<number>
  uuid: string
  code: string
  name: string
  description: string | null
  hex_code: string | null
  is_active: boolean
  created_at: Generated<Date>
  updated_at: Generated<Date>
  deleted_at: Date | null
}

export interface TenantCommonSizesTable {
  id: Generated<number>
  uuid: string
  code: string
  name: string
  description: string | null
  sort_order: number | null
  is_active: boolean
  created_at: Generated<Date>
  updated_at: Generated<Date>
  deleted_at: Date | null
}

export interface TenantCommonCurrenciesTable {
  id: Generated<number>
  uuid: string
  code: string
  name: string
  symbol: string
  decimal_places: number | null
  is_active: boolean
  created_at: Generated<Date>
  updated_at: Generated<Date>
  deleted_at: Date | null
}

export interface TenantCommonOrderTypesTable {
  id: Generated<number>
  uuid: string
  code: string
  name: string
  description: string | null
  is_active: boolean
  created_at: Generated<Date>
  updated_at: Generated<Date>
  deleted_at: Date | null
}

export interface TenantCommonStylesTable {
  id: Generated<number>
  uuid: string
  code: string
  name: string
  description: string | null
  is_active: boolean
  created_at: Generated<Date>
  updated_at: Generated<Date>
  deleted_at: Date | null
}

export interface TenantCommonTransportsTable {
  id: Generated<number>
  uuid: string
  code: string
  name: string
  gst: string | null
  vehicle_no: string | null
  address: string | null
  contact_no: string | null
  contact_person: string | null
  description: string | null
  is_active: boolean
  created_at: Generated<Date>
  updated_at: Generated<Date>
  deleted_at: Date | null
}

export interface TenantCommonWarehousesTable {
  id: Generated<number>
  uuid: string
  code: string
  name: string
  is_default_location: boolean
  country: string | null
  state: string | null
  district: string | null
  city: string | null
  pincode: string | null
  address_line1: string | null
  address_line2: string | null
  description: string | null
  is_active: boolean
  created_at: Generated<Date>
  updated_at: Generated<Date>
  deleted_at: Date | null
}

export interface TenantCommonDestinationsTable {
  id: Generated<number>
  uuid: string
  code: string
  name: string
  description: string | null
  is_active: boolean
  created_at: Generated<Date>
  updated_at: Generated<Date>
  deleted_at: Date | null
}

export interface TenantCommonPaymentTermsTable {
  id: Generated<number>
  uuid: string
  code: string
  name: string
  description: string | null
  due_days: number | null
  is_active: boolean
  created_at: Generated<Date>
  updated_at: Generated<Date>
  deleted_at: Date | null
}

export interface TenantCommonMonthsTable {
  id: Generated<number>
  uuid: string
  code: string
  name: string
  start_date: string
  end_date: string
  description: string | null
  is_active: boolean
  created_at: Generated<Date>
  updated_at: Generated<Date>
  deleted_at: Date | null
}

export interface TenantCommonStockRejectionTypesTable {
  id: Generated<number>
  uuid: string
  code: string
  name: string
  description: string | null
  is_active: boolean
  created_at: Generated<Date>
  updated_at: Generated<Date>
  deleted_at: Date | null
}

export interface TenantSalesEntriesTable {
  id: Generated<number>
  uuid: string
  tenant_id: number
  company_id: number
  accounting_year_id: number
  invoice_no: string
  invoice_date: string
  customer_id: string | null
  customer_name: string
  customer_gstin: string | null
  customer_state_code: string | null
  customer_state_name: string | null
  billing_address: string | null
  shipping_address: string | null
  place_of_supply: string | null
  reference_no: string | null
  due_date: string | null
  subtotal: number
  discount_total: number
  taxable_total: number
  tax_total: number
  round_off: number
  grand_total: number
  paid_amount: number
  balance_amount: number
  status: string
  payment_status: string
  irn: string | null
  ack_no: string | null
  ack_date: Date | null
  signed_qr: string | null
  eway_bill_no: string | null
  eway_bill_date: Date | null
  transport_id: string | null
  transport_name: string | null
  transport_gst: string | null
  transport_address: string | null
  transport_contact_no: string | null
  transport_contact_person: string | null
  vehicle_no: string | null
  eway_part: string | null
  notes: string | null
  terms: string | null
  is_active: boolean
  created_at: Generated<Date>
  updated_at: Generated<Date>
  deleted_at: Date | null
}

export interface TenantSalesEntryItemsTable {
  id: Generated<number>
  uuid: string
  sales_entry_id: number
  product_id: string | null
  product_name: string
  description: string | null
  colour: string | null
  hsn_code: string | null
  po_no: string | null
  dc_no: string | null
  size: string | null
  unit: string | null
  quantity: number
  rate: number
  discount_amount: number
  tax_rate: number
  tax_amount: number
  line_total: number
  sort_order: number
  created_at: Generated<Date>
  updated_at: Generated<Date>
}

export interface TenantSalesEntryCommentsTable {
  id: Generated<number>
  uuid: string
  sales_entry_id: number
  author_email: string
  body: string
  created_at: Generated<Date>
}

export interface TenantSalesEntryActivitiesTable {
  id: Generated<number>
  uuid: string
  sales_entry_id: number
  activity_type: string
  actor_email: string
  message: string
  payload: string
  created_at: Generated<Date>
}

export interface TenantCommonPrioritiesTable {
  id: Generated<number>
  uuid: string
  name: string
  colour: string
  tag: string
  is_active: boolean
  created_at: Generated<Date>
  updated_at: Generated<Date>
  deleted_at: Date | null
}

export interface TenantExportSalesEntriesTable extends TenantSalesEntriesTable {
  currency_id: number | null
  currency_name: string | null
}

export interface TenantExportSalesEntryItemsTable extends Omit<TenantSalesEntryItemsTable, 'sales_entry_id'> {
  export_sales_entry_id: number
}

export interface TenantExportSalesEntryCommentsTable extends Omit<TenantSalesEntryCommentsTable, 'sales_entry_id'> {
  export_sales_entry_id: number
}

export interface TenantExportSalesEntryActivitiesTable extends Omit<TenantSalesEntryActivitiesTable, 'sales_entry_id'> {
  export_sales_entry_id: number
}

export interface TenantCompanySettingsTable {
  id: Generated<number>
  uuid: string
  company_id: number
  setting_key: string
  values_json: string
  created_at: Generated<Date>
  updated_at: Generated<Date>
}

export interface TenantDocumentNumberSettingsTable {
  id: Generated<number>
  uuid: string
  company_id: number
  accounting_year_id: number
  entry_kind: string
  prefix: string
  prefix_enabled: boolean
  separator: string
  separator_enabled: boolean
  suffix: string
  suffix_enabled: boolean
  next_number: number
  padding: number
  auto_enabled: boolean
  created_at: Generated<Date>
  updated_at: Generated<Date>
}

export interface TenantGstProviderSettingsTable {
  id: Generated<number>
  uuid: string
  tenant_id: number
  company_id: number
  provider: string
  environment: string
  base_url: string
  email: string
  username: string
  password_secret: string | null
  client_id: string
  client_secret: string | null
  gstin: string
  ip_address: string
  is_enabled: boolean
  created_at: Generated<Date>
  updated_at: Generated<Date>
}

export interface TenantGstProviderTokensTable {
  id: Generated<number>
  uuid: string
  tenant_id: number
  setting_id: number
  provider: string
  environment: string
  purpose: string
  gstin: string
  auth_token: string
  sek: string | null
  token_expiry: Date | null
  raw_response_json: string | null
  created_at: Generated<Date>
  updated_at: Generated<Date>
}

export interface TenantGstComplianceDocumentsTable {
  id: Generated<number>
  uuid: string
  tenant_id: number
  company_id: number
  provider: string
  environment: string
  source_type: string
  source_id: number | null
  source_uuid: string | null
  document_type: string
  document_no: string
  document_date: string | null
  gstin: string | null
  irn: string | null
  ack_no: string | null
  ack_date: Date | string | null
  signed_invoice: string | null
  signed_qr: string | null
  eway_bill_no: string | null
  eway_bill_date: Date | string | null
  eway_valid_upto: Date | string | null
  irn_status: string
  eway_status: string
  last_operation_id: number | null
  created_at: Generated<Date>
  updated_at: Generated<Date>
}

export interface TenantGstComplianceOperationsTable {
  id: Generated<number>
  uuid: string
  tenant_id: number
  company_id: number
  setting_id: number | null
  provider: string
  environment: string
  operation: string
  source_type: string | null
  source_id: number | null
  source_uuid: string | null
  document_no: string | null
  method: string
  endpoint: string
  http_status: number | null
  provider_status: string | null
  success: boolean
  error_message: string | null
  request_json: string | null
  response_json: string | null
  created_by: string
  created_at: Generated<Date>
}

export interface TenantMastersContactsTable {
  id: Generated<number>
  uuid: string
  code: string
  name: string
  contact_type_id: string | null
  ledger_id: string | null
  ledger_name: string | null
  legal_name: string | null
  pan: string | null
  gstin: string | null
  msme_type: string | null
  msme_no: string | null
  tan: string | null
  tds_available: boolean | null
  tcs_available: boolean | null
  opening_balance: number | null
  balance_type: string | null
  credit_limit: number | null
  website: string | null
  primary_email: string | null
  primary_phone: string | null
  description: string | null
  is_active: boolean
  created_at: Generated<Date>
  updated_at: Generated<Date>
  deleted_at: Date | null
}

export interface TenantMastersProductsTable {
  id: Generated<number>
  uuid: string
  code: string
  name: string
  product_group_id: number | null
  product_category_id: number | null
  product_type_id: number | null
  hsn_code_id: number | null
  brand_id: number | null
  colour_id: number | null
  size_id: number | null
  unit_id: number | null
  tax_id: number | null
  style_id: number | null
  description: string | null
  is_active: boolean
  created_at: Generated<Date>
  updated_at: Generated<Date>
  deleted_at: Date | null
}

export interface TenantMastersOrdersTable {
  id: Generated<number>
  uuid: string
  code: string
  name: string
  description: string | null
  is_active: boolean
  created_at: Generated<Date>
  updated_at: Generated<Date>
  deleted_at: Date | null
}

export interface TenantMastersAuditorClientsTable {
  id: Generated<number>
  uuid: string
  name: string
  group_name: string | null
  contact_person: string | null
  mobile: string | null
  whatsapp: string | null
  email: string | null
  gstin: string | null
  address_line_1: string | null
  address_line_2: string | null
  city_id: string | null
  city: string | null
  state_id: string | null
  state: string | null
  pincode_id: string | null
  pincode: string | null
  gst_user: string | null
  gst_pass: string | null
  einvoice_user: string | null
  einvoice_pass: string | null
  eway_user: string | null
  eway_pass: string | null
  einvoice_api_user: string | null
  einvoice_api_pass: string | null
  eway_api_user: string | null
  eway_api_pass: string | null
  email_account_user: string | null
  email_account_pass: string | null
  is_active: boolean
  created_at: Generated<Date>
  updated_at: Generated<Date>
  deleted_at: Date | null
}

export interface TenantAuditorGstFilingsTable {
  id: Generated<number>
  uuid: string
  contact_id: number
  contact_name: string
  client_id: number | null
  client_name: string | null
  month_id: string | null
  month_name: string
  accounting_year_id: string | null
  accounting_year_name: string
  gstr1_arn: string | null
  gstr1_date: string | null
  gstr3b_arn: string | null
  gstr3b_date: string | null
  status: string
  is_active: boolean
  created_at: Generated<Date>
  updated_at: Generated<Date>
  deleted_at: Date | null
}

export interface TenantAuditorContactCredentialsTable {
  id: Generated<number>
  uuid: string
  contact_id: number
  contact_name: string
  gst_user: string | null
  gst_pass: string | null
  einvoice_user: string | null
  einvoice_pass: string | null
  eway_user: string | null
  eway_pass: string | null
  einvoice_api_user: string | null
  einvoice_api_pass: string | null
  eway_api_user: string | null
  eway_api_pass: string | null
  email_account_user: string | null
  email_account_pass: string | null
  is_active: boolean
  created_at: Generated<Date>
  updated_at: Generated<Date>
  deleted_at: Date | null
}

export interface TenantDatabaseSchema {
  companies: TenantCompaniesTable
  accounting_years: TenantAccountingYearsTable
  default_companies: TenantDefaultCompaniesTable
  company_logos: TenantCompanyLogosTable
  address_book: TenantAddressBookTable
  company_emails: TenantCompanyEmailsTable
  company_phones: TenantCompanyPhonesTable
  contact_emails: TenantContactEmailsTable
  contact_phones: TenantContactPhonesTable
  contact_social_links: TenantContactSocialLinksTable
  contact_bank_accounts: TenantContactBankAccountsTable
  contact_gst_details: TenantContactGstDetailsTable
  company_social_links: TenantCompanySocialLinksTable
  company_bank_accounts: TenantCompanyBankAccountsTable
  rbac_roles: TenantRbacRolesTable
  rbac_policies: TenantRbacPoliciesTable
  rbac_role_policies: TenantRbacRolePoliciesTable
  users: TenantUsersTable
  user_tenants: TenantUserTenantsTable
  common_countries: TenantCommonCountriesTable
  common_states: TenantCommonStatesTable
  common_districts: TenantCommonDistrictsTable
  common_cities: TenantCommonCitiesTable
  common_pincodes: TenantCommonPincodesTable
  common_contact_groups: TenantCommonContactGroupsTable
  common_contact_types: TenantCommonContactTypesTable
  common_address_types: TenantCommonAddressTypesTable
  common_bank_names: TenantCommonBankNamesTable
  common_product_groups: TenantCommonProductGroupsTable
  common_product_categories: TenantCommonProductCategoriesTable
  common_product_types: TenantCommonProductTypesTable
  common_units: TenantCommonUnitsTable
  common_hsn_codes: TenantCommonHsnCodesTable
  common_taxes: TenantCommonTaxesTable
  common_brands: TenantCommonBrandsTable
  common_colours: TenantCommonColoursTable
  common_sizes: TenantCommonSizesTable
  common_currencies: TenantCommonCurrenciesTable
  common_priorities: TenantCommonPrioritiesTable
  common_order_types: TenantCommonOrderTypesTable
  common_styles: TenantCommonStylesTable
  common_transports: TenantCommonTransportsTable
  common_warehouses: TenantCommonWarehousesTable
  common_destinations: TenantCommonDestinationsTable
  common_payment_terms: TenantCommonPaymentTermsTable
  common_months: TenantCommonMonthsTable
  common_stock_rejection_types: TenantCommonStockRejectionTypesTable
  sales_entries: TenantSalesEntriesTable
  sales_entry_items: TenantSalesEntryItemsTable
  sales_entry_comments: TenantSalesEntryCommentsTable
  sales_entry_activities: TenantSalesEntryActivitiesTable
  export_sales_entries: TenantExportSalesEntriesTable
  export_sales_entry_items: TenantExportSalesEntryItemsTable
  export_sales_entry_comments: TenantExportSalesEntryCommentsTable
  export_sales_entry_activities: TenantExportSalesEntryActivitiesTable
  company_settings: TenantCompanySettingsTable
  document_number_settings: TenantDocumentNumberSettingsTable
  gst_provider_settings: TenantGstProviderSettingsTable
  gst_provider_tokens: TenantGstProviderTokensTable
  gst_compliance_documents: TenantGstComplianceDocumentsTable
  gst_compliance_operations: TenantGstComplianceOperationsTable
  masters_contacts: TenantMastersContactsTable
  masters_products: TenantMastersProductsTable
  masters_orders: TenantMastersOrdersTable
  masters_auditor_clients: TenantMastersAuditorClientsTable
  auditor_contact_credentials: TenantAuditorContactCredentialsTable
  auditor_gst_filings: TenantAuditorGstFilingsTable
}
