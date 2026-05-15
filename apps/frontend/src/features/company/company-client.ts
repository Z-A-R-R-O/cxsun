import { apiBaseUrl, authHeaders, type AuthSession } from "src/features/auth/auth-client"

export type CompanyStatus = "active" | "not_active" | "suspend"

export interface CompanyLogo {
  id?: number
  logoUrl: string
  logoType: string
  isActive: boolean
}

export interface CompanyAddress {
  id?: number
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
  email: string
  emailType: string
  isActive: boolean
}

export interface CompanyPhone {
  id?: number
  phoneNumber: string
  phoneType: string
  isPrimary: boolean
  isActive: boolean
}

export interface CompanySocialLink {
  id?: number
  platform: string
  url: string
  isActive: boolean
}

export interface CompanyBankAccount {
  id?: number
  bankName: string
  accountNumber: string
  accountHolderName: string
  ifsc: string
  branch: string | null
  qrImageUrl: string | null
  isPrimary: boolean
  isActive: boolean
}

export interface CompanyRecord {
  id: number
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

export type CompanyUpsertInput = Omit<
  CompanyRecord,
  "id" | "tenantId" | "tenantName" | "industryId" | "industryCode" | "industryName" | "createdAt" | "updatedAt" | "deletedAt"
> & { id?: number }

export async function listCompanies(session: AuthSession) {
  const response = await fetch(`${apiBaseUrl}/api/v1/companies`, {
    cache: "no-store",
    headers: authHeaders(session),
  })

  if (!response.ok) {
    throw new Error(`Company list failed with status ${response.status}.`)
  }

  return (await response.json()) as CompanyRecord[]
}

export async function getCompany(session: AuthSession, id: number) {
  const response = await fetch(`${apiBaseUrl}/api/v1/companies/${id}`, {
    cache: "no-store",
    headers: authHeaders(session),
  })

  if (!response.ok) {
    throw new Error(`Company get failed with status ${response.status}.`)
  }

  return (await response.json()) as CompanyRecord
}

export async function upsertCompany(session: AuthSession, input: CompanyUpsertInput) {
  const response = await fetch(`${apiBaseUrl}/api/v1/companies/upsert`, {
    body: JSON.stringify(input),
    cache: "no-store",
    headers: {
      ...authHeaders(session),
      "Content-Type": "application/json",
    },
    method: "POST",
  })

  if (!response.ok) {
    throw new Error(`Company save failed with status ${response.status}.`)
  }

  const result = (await response.json()) as { ok: boolean; company?: CompanyRecord; error?: string }

  if (!result.ok || !result.company) {
    throw new Error(result.error ?? "Company save failed.")
  }

  return result.company
}

export async function destroyCompany(session: AuthSession, id: number) {
  await mutateCompany(session, id, "destroy")
}

export async function restoreCompany(session: AuthSession, id: number) {
  await mutateCompany(session, id, "restore")
}

async function mutateCompany(session: AuthSession, id: number, action: "destroy" | "restore") {
  const response = await fetch(`${apiBaseUrl}/api/v1/companies/${id}/${action}`, {
    body: "{}",
    cache: "no-store",
    headers: {
      ...authHeaders(session),
      "Content-Type": "application/json",
    },
    method: "POST",
  })

  if (!response.ok) {
    throw new Error(`Company ${action} failed with status ${response.status}.`)
  }

  const result = (await response.json()) as { ok: boolean; error?: string }

  if (!result.ok) {
    throw new Error(result.error ?? `Company ${action} failed.`)
  }
}

export function emptyCompany(): CompanyUpsertInput {
  return {
    code: "",
    name: "",
    legalName: null,
    tagline: null,
    shortAbout: null,
    gstinUin: null,
    pan: null,
    dateOfIncorporation: null,
    msmeNo: null,
    msmeCategory: null,
    tan: null,
    tdsAvailable: false,
    tdsSection: null,
    tdsRatePercent: null,
    tcsAvailable: false,
    tcsSection: null,
    tcsRatePercent: null,
    website: null,
    description: null,
    primaryEmail: null,
    primaryPhone: null,
    isPrimary: false,
    isActive: true,
    status: "active",
    settings: { timezone: "Asia/Calcutta", currency: "INR" },
    features: ["company.manage"],
    logos: [
      { logoUrl: "/storage/logo/logo.svg", logoType: "logo", isActive: true },
      { logoUrl: "/storage/logo/favicon.svg", logoType: "favicon", isActive: true },
    ],
    addresses: [],
    emails: [],
    phones: [],
    socialLinks: [],
    bankAccounts: [],
  }
}

export function toCompanyInput(company: CompanyRecord): CompanyUpsertInput {
  return {
    id: company.id,
    code: company.code,
    name: company.name,
    legalName: company.legalName,
    tagline: company.tagline,
    shortAbout: company.shortAbout,
    gstinUin: company.gstinUin,
    pan: company.pan,
    dateOfIncorporation: company.dateOfIncorporation,
    msmeNo: company.msmeNo,
    msmeCategory: company.msmeCategory,
    tan: company.tan,
    tdsAvailable: company.tdsAvailable,
    tdsSection: company.tdsSection,
    tdsRatePercent: company.tdsRatePercent,
    tcsAvailable: company.tcsAvailable,
    tcsSection: company.tcsSection,
    tcsRatePercent: company.tcsRatePercent,
    website: company.website,
    description: company.description,
    primaryEmail: company.primaryEmail,
    primaryPhone: company.primaryPhone,
    isPrimary: company.isPrimary,
    isActive: company.isActive,
    status: company.status,
    settings: company.settings,
    features: company.features,
    logos: company.logos,
    addresses: company.addresses,
    emails: company.emails,
    phones: company.phones,
    socialLinks: company.socialLinks,
    bankAccounts: company.bankAccounts,
  }
}
