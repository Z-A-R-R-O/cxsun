export interface ContactAddress {
  id: string
  contactId: string
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

export interface ContactEmail {
  id: string
  contactId: string
  email: string
  emailType: string
  isPrimary: boolean
  isActive: boolean
}

export interface ContactPhone {
  id: string
  contactId: string
  phoneNumber: string
  phoneType: string
  isPrimary: boolean
  isActive: boolean
}

export interface ContactSocialLink {
  id: string
  contactId: string
  platform: string
  url: string
  isActive: boolean
}

export interface ContactBankAccount {
  id: string
  contactId: string
  bankName: string
  accountNumber: string
  accountHolderName: string
  ifsc: string
  branch: string | null
  isPrimary: boolean
  isActive: boolean
}

export interface ContactGstDetail {
  id: string
  contactId: string
  gstin: string
  state: string
  isDefault: boolean
  isActive: boolean
}

export interface ContactRecord {
  id: number
  uuid: string
  tenant_id: number
  company_id: number
  code: string
  contactTypeId: string | null
  ledgerId: string | null
  ledgerName: string | null
  name: string
  legalName: string | null
  pan: string | null
  gstin: string | null
  msmeType: string | null
  msmeNo: string | null
  tan: string | null
  tdsAvailable: boolean
  tcsAvailable: boolean
  openingBalance: number
  balanceType: string | null
  creditLimit: number
  website: string | null
  description: string | null
  primaryEmail: string | null
  primaryPhone: string | null
  isActive: boolean
  createdAt: Date
  updatedAt: Date
  deletedAt: Date | null
  addresses: ContactAddress[]
  emails: ContactEmail[]
  phones: ContactPhone[]
  socialLinks: ContactSocialLink[]
  bankAccounts: ContactBankAccount[]
  gstDetails: ContactGstDetail[]
}

