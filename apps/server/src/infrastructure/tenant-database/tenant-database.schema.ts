import type { Generated } from 'kysely'

export interface TenantCompaniesTable {
  id: Generated<number>
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
  name: string
  start_date: string
  end_date: string
  books_start: string
  is_active: boolean
  created_at: Generated<Date>
  updated_at: Generated<Date>
  deleted_at: Date | null
}

export interface TenantDefaultCompaniesTable {
  id: Generated<number>
  tenant_id: number
  industry_id: number
  company_id: number
  accounting_year_id: number
  is_active: boolean
  created_at: Generated<Date>
  updated_at: Generated<Date>
}

export interface TenantCompanyLogosTable {
  id: Generated<number>
  company_id: number
  logo_url: string
  logo_type: string
  is_active: boolean
  created_at: Generated<Date>
  updated_at: Generated<Date>
}

export interface TenantAddressBookTable {
  id: Generated<number>
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
  company_id: number
  email: string
  email_type: string
  is_active: boolean
  created_at: Generated<Date>
  updated_at: Generated<Date>
}

export interface TenantCompanyPhonesTable {
  id: Generated<number>
  company_id: number
  phone_number: string
  phone_type: string
  is_primary: boolean
  is_active: boolean
  created_at: Generated<Date>
  updated_at: Generated<Date>
}

export interface TenantCompanySocialLinksTable {
  id: Generated<number>
  company_id: number
  platform: string
  url: string
  is_active: boolean
  created_at: Generated<Date>
  updated_at: Generated<Date>
}

export interface TenantCompanyBankAccountsTable {
  id: Generated<number>
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
  code: string
  name: string
  settings: string
  created_at: Generated<Date>
  updated_at: Generated<Date>
}

export interface TenantRbacPoliciesTable {
  id: Generated<number>
  code: string
  name: string
  description: string
  created_at: Generated<Date>
}

export interface TenantRbacRolePoliciesTable {
  id: Generated<number>
  role_code: string
  policy_code: string
  created_at: Generated<Date>
}

export interface TenantDatabaseSchema {
  companies: TenantCompaniesTable
  accounting_years: TenantAccountingYearsTable
  default_companies: TenantDefaultCompaniesTable
  company_logos: TenantCompanyLogosTable
  address_book: TenantAddressBookTable
  company_emails: TenantCompanyEmailsTable
  company_phones: TenantCompanyPhonesTable
  company_social_links: TenantCompanySocialLinksTable
  company_bank_accounts: TenantCompanyBankAccountsTable
  rbac_roles: TenantRbacRolesTable
  rbac_policies: TenantRbacPoliciesTable
  rbac_role_policies: TenantRbacRolePoliciesTable
}
