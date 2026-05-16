export type CompanyStatus = 'active' | 'not_active' | 'suspend'

export interface CompanyLogo {
  id?: number
  uuid?: string
  logoUrl: string
  logoType: string
  isActive: boolean
}

export interface CompanyAddress {
  id?: number
  uuid?: string
  addressTypeId: string | null
  addressLine1: string
  addressLine2: string | null
  cityId: string | null
  districtId: string | null
  stateId: string | null
  countryId: string | null
  pincodeId: string | null
  latitude: number | null
  longitude: number | null
  isDefault: boolean
  isActive: boolean
}

export interface CompanyEmail {
  id?: number
  uuid?: string
  email: string
  emailType: string
  isActive: boolean
}

export interface CompanyPhone {
  id?: number
  uuid?: string
  phoneNumber: string
  phoneType: string
  isPrimary: boolean
  isActive: boolean
}

export interface CompanySocialLink {
  id?: number
  uuid?: string
  platform: string
  url: string
  isActive: boolean
}

export interface CompanyBankAccount {
  id?: number
  uuid?: string
  bankName: string
  accountNumber: string
  accountHolderName: string
  ifsc: string
  branch: string | null
  qrImageUrl: string | null
  isPrimary: boolean
  isActive: boolean
}

export interface Company {
  id: number
  uuid: string
  tenantId: number | null
  tenantName: string
  industryId: number | null
  industryCode: string | null
  industryName: string
  code: string
  name: string
  legalName: string | null
  tagline: string | null
  shortAbout: string | null
  gstinUin: string | null
  pan: string | null
  dateOfIncorporation: string | null
  msmeNo: string | null
  msmeCategory: string | null
  tan: string | null
  tdsAvailable: boolean
  tdsSection: string | null
  tdsRatePercent: number | null
  tcsAvailable: boolean
  tcsSection: string | null
  tcsRatePercent: number | null
  website: string | null
  description: string | null
  primaryEmail: string | null
  primaryPhone: string | null
  isPrimary: boolean
  isActive: boolean
  status: CompanyStatus
  settings: Record<string, unknown>
  features: string[]
  logos: CompanyLogo[]
  addresses: CompanyAddress[]
  emails: CompanyEmail[]
  phones: CompanyPhone[]
  socialLinks: CompanySocialLink[]
  bankAccounts: CompanyBankAccount[]
  createdAt: string | null
  updatedAt: string | null
  deletedAt: string | null
}

export interface CompanyUpsertInput {
  id?: number
  industryId?: number | null
  code?: string
  name: string
  legalName?: string | null
  tagline?: string | null
  shortAbout?: string | null
  gstinUin?: string | null
  pan?: string | null
  dateOfIncorporation?: string | null
  msmeNo?: string | null
  msmeCategory?: string | null
  tan?: string | null
  tdsAvailable?: boolean
  tdsSection?: string | null
  tdsRatePercent?: number | null
  tcsAvailable?: boolean
  tcsSection?: string | null
  tcsRatePercent?: number | null
  website?: string | null
  description?: string | null
  primaryEmail?: string | null
  primaryPhone?: string | null
  isPrimary?: boolean
  isActive?: boolean
  status?: CompanyStatus
  settings?: Record<string, unknown>
  features?: string[]
  logos?: CompanyLogo[]
  addresses?: CompanyAddress[]
  emails?: CompanyEmail[]
  phones?: CompanyPhone[]
  socialLinks?: CompanySocialLink[]
  bankAccounts?: CompanyBankAccount[]
}
