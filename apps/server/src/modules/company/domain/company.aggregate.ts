import type {
  CompanyAddress,
  CompanyBankAccount,
  CompanyEmail,
  CompanyLogo,
  CompanyPhone,
  CompanySocialLink,
  CompanyStatus,
  CompanyUpsertInput,
} from './company.types.js'

export interface NormalizedCompanyData {
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
  status: CompanyStatus
  settings: string
  features: string
  logos: CompanyLogo[]
  addresses: CompanyAddress[]
  emails: CompanyEmail[]
  phones: CompanyPhone[]
  socialLinks: CompanySocialLink[]
  bankAccounts: CompanyBankAccount[]
}

export class CompanyAggregate {
  static normalize(input: CompanyUpsertInput): NormalizedCompanyData {
    const name = input.name?.trim()
    const code = normalizeCode(input.code || name)
    const isActive = input.isActive ?? input.status !== 'suspend'
    const status = input.status ?? (isActive ? 'active' : 'suspend')

    if (!name) {
      throw new CompanyValidationError('Company name is required.')
    }

    if (!code) {
      throw new CompanyValidationError('Company code is required.')
    }

    if (!['active', 'not_active', 'suspend'].includes(status)) {
      throw new CompanyValidationError('Company status is invalid.')
    }

    return {
      code,
      name,
      legal_name: nullable(input.legalName),
      tagline: nullable(input.tagline),
      short_about: nullable(input.shortAbout),
      gstin_uin: nullable(input.gstinUin),
      pan: nullable(input.pan),
      date_of_incorporation: nullable(input.dateOfIncorporation),
      msme_no: nullable(input.msmeNo),
      msme_category: nullable(input.msmeCategory),
      tan: nullable(input.tan),
      tds_available: Boolean(input.tdsAvailable),
      tds_section: nullable(input.tdsSection),
      tds_rate_percent: nullableNumber(input.tdsRatePercent),
      tcs_available: Boolean(input.tcsAvailable),
      tcs_section: nullable(input.tcsSection),
      tcs_rate_percent: nullableNumber(input.tcsRatePercent),
      website: nullable(input.website),
      description: nullable(input.description),
      primary_email: nullable(input.primaryEmail),
      primary_phone: nullable(input.primaryPhone),
      is_primary: Boolean(input.isPrimary),
      is_active: isActive && status !== 'suspend',
      status,
      settings: JSON.stringify(input.settings ?? { timezone: 'Asia/Calcutta', currency: 'INR' }),
      features: JSON.stringify(input.features ?? ['company.manage']),
      logos: normalizeLogos(input.logos),
      addresses: normalizeAddresses(input.addresses),
      emails: normalizeEmails(input.emails),
      phones: normalizePhones(input.phones),
      socialLinks: normalizeSocialLinks(input.socialLinks),
      bankAccounts: normalizeBankAccounts(input.bankAccounts),
    }
  }
}

export class CompanyValidationError extends Error {}

function normalizeCode(value: string | undefined) {
  return (value ?? '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 64)
}

function nullable(value: string | null | undefined) {
  const trimmed = value?.trim() ?? ''
  return trimmed ? trimmed : null
}

function nullableNumber(value: number | null | undefined) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function normalizeLogos(logos: CompanyLogo[] | undefined) {
  return (logos ?? []).filter((logo) => logo.logoUrl.trim() && logo.logoType.trim()).map((logo) => ({
    logoUrl: logo.logoUrl.trim(),
    logoType: logo.logoType.trim(),
    isActive: logo.isActive ?? true,
  }))
}

function normalizeEmails(emails: CompanyEmail[] | undefined) {
  return (emails ?? []).filter((email) => email.email.trim()).map((email) => ({
    email: email.email.trim(),
    emailType: email.emailType?.trim() || 'Primary',
    isActive: email.isActive ?? true,
  }))
}

function normalizePhones(phones: CompanyPhone[] | undefined) {
  return (phones ?? []).filter((phone) => phone.phoneNumber.trim()).map((phone) => ({
    phoneNumber: phone.phoneNumber.trim(),
    phoneType: phone.phoneType?.trim() || 'Mobile',
    isPrimary: Boolean(phone.isPrimary),
    isActive: phone.isActive ?? true,
  }))
}

function normalizeSocialLinks(socialLinks: CompanySocialLink[] | undefined) {
  return (socialLinks ?? []).filter((link) => link.platform.trim() && link.url.trim()).map((link) => ({
    platform: link.platform.trim(),
    url: link.url.trim(),
    isActive: link.isActive ?? true,
  }))
}

function normalizeBankAccounts(bankAccounts: CompanyBankAccount[] | undefined) {
  return (bankAccounts ?? [])
    .filter((bank) => bank.bankName.trim() || bank.accountNumber.trim())
    .map((bank) => ({
      bankName: bank.bankName.trim(),
      accountNumber: bank.accountNumber.trim(),
      accountHolderName: bank.accountHolderName?.trim() || '',
      ifsc: bank.ifsc?.trim() || '',
      branch: nullable(bank.branch),
      qrImageUrl: nullable(bank.qrImageUrl),
      isPrimary: Boolean(bank.isPrimary),
      isActive: bank.isActive ?? true,
    }))
}

function normalizeAddresses(addresses: CompanyAddress[] | undefined) {
  return (addresses ?? []).filter((address) => address.addressLine1.trim()).map((address) => ({
    addressTypeId: nullable(address.addressTypeId),
    addressLine1: address.addressLine1.trim(),
    addressLine2: nullable(address.addressLine2),
    cityId: nullable(address.cityId),
    districtId: nullable(address.districtId),
    stateId: nullable(address.stateId),
    countryId: nullable(address.countryId),
    pincodeId: nullable(address.pincodeId),
    latitude: nullableNumber(address.latitude),
    longitude: nullableNumber(address.longitude),
    isDefault: Boolean(address.isDefault),
    isActive: address.isActive ?? true,
  }))
}
