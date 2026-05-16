import { apiBaseUrl, authHeaders, type AuthSession } from "src/features/auth/auth-client"

export interface ContactAddress {
  id?: string
  contactId?: string
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
  isActive?: boolean
}

export interface ContactEmail { id?: string; contactId?: string; email: string; emailType: string; isPrimary: boolean; isActive?: boolean }
export interface ContactPhone { id?: string; contactId?: string; phoneNumber: string; phoneType: string; isPrimary: boolean; isActive?: boolean }
export interface ContactSocialLink { id?: string; contactId?: string; platform: string; url: string; isActive: boolean }
export interface ContactBankAccount { id?: string; contactId?: string; bankName: string; accountNumber: string; accountHolderName: string; ifsc: string; branch: string | null; isPrimary: boolean; isActive?: boolean }
export interface ContactGstDetail { id?: string; contactId?: string; gstin: string; state: string; isDefault: boolean; isActive?: boolean }

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
  createdAt: string
  updatedAt: string
  deletedAt: string | null
  addresses: ContactAddress[]
  emails: ContactEmail[]
  phones: ContactPhone[]
  socialLinks: ContactSocialLink[]
  bankAccounts: ContactBankAccount[]
  gstDetails: ContactGstDetail[]
}

export type ContactInput = Partial<ContactRecord> & {
  addresses: ContactAddress[]
  emails: ContactEmail[]
  phones: ContactPhone[]
  socialLinks: ContactSocialLink[]
  bankAccounts: ContactBankAccount[]
  gstDetails: ContactGstDetail[]
}

export function emptyContact(): ContactInput {
  return {
    code: "",
    contactTypeId: null,
    ledgerId: null,
    ledgerName: null,
    name: "",
    legalName: "",
    pan: "",
    gstin: "",
    msmeType: null,
    msmeNo: "",
    tan: "",
    tdsAvailable: false,
    tcsAvailable: false,
    openingBalance: 0,
    balanceType: null,
    creditLimit: 0,
    website: "",
    description: "",
    isActive: true,
    addresses: [emptyAddress()],
    emails: [{ email: "", emailType: "primary", isPrimary: true }],
    phones: [{ phoneNumber: "", phoneType: "mobile", isPrimary: true }],
    socialLinks: [],
    bankAccounts: [],
    gstDetails: [],
  }
}

export function emptyAddress(): ContactAddress {
  return {
    addressTypeId: null,
    addressLine1: "",
    addressLine2: "",
    cityId: null,
    districtId: null,
    stateId: null,
    countryId: null,
    pincodeId: null,
    latitude: null,
    longitude: null,
    isDefault: true,
  }
}

export async function listContacts(session: AuthSession) {
  const response = await fetch(`${apiBaseUrl}/api/v1/contacts`, { cache: "no-store", headers: authHeaders(session) })
  if (!response.ok) throw new Error(`Contact list failed with status ${response.status}.`)
  return (await response.json()) as ContactRecord[]
}

export async function upsertContact(session: AuthSession, input: ContactInput) {
  const response = await fetch(`${apiBaseUrl}/api/v1/contacts/upsert`, {
    body: JSON.stringify(input),
    cache: "no-store",
    headers: { ...authHeaders(session), "Content-Type": "application/json" },
    method: "POST",
  })
  if (!response.ok) throw new Error(`Contact save failed with status ${response.status}.`)
  const result = (await response.json()) as { ok: boolean; record?: ContactRecord; error?: string }
  if (!result.ok || !result.record) throw new Error(result.error ?? "Contact save failed.")
  return result.record
}

export async function destroyContact(session: AuthSession, contact: ContactRecord) {
  await mutateContact(session, contact.uuid, "destroy")
}

export async function restoreContact(session: AuthSession, contact: ContactRecord) {
  await mutateContact(session, contact.uuid, "restore")
}

async function mutateContact(session: AuthSession, idOrUuid: string, action: "destroy" | "restore") {
  const response = await fetch(`${apiBaseUrl}/api/v1/contacts/${encodeURIComponent(idOrUuid)}/${action}`, {
    body: "{}",
    cache: "no-store",
    headers: { ...authHeaders(session), "Content-Type": "application/json" },
    method: "POST",
  })
  if (!response.ok) throw new Error(`Contact ${action} failed with status ${response.status}.`)
  const result = (await response.json()) as { ok: boolean; error?: string }
  if (!result.ok) throw new Error(result.error ?? `Contact ${action} failed.`)
}

