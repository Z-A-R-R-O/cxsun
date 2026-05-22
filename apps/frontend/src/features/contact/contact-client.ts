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

type RawContactRecord = Partial<ContactRecord> & {
  created_at?: unknown
  deleted_at?: unknown
  updated_at?: unknown
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
  const records = (await response.json()) as RawContactRecord[]
  return records.map(normalizeContactRecord)
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
  return normalizeContactRecord(result.record)
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

function normalizeContactRecord(record: RawContactRecord): ContactRecord {
  const fallbackCode = String(record.code ?? record.uuid ?? record.id ?? "")
  const fallbackName = String(record.name ?? record.legalName ?? (fallbackCode || "Contact"))

  return {
    id: Number(record.id ?? 0),
    uuid: String(record.uuid ?? fallbackCode),
    tenant_id: Number(record.tenant_id ?? 0),
    company_id: Number(record.company_id ?? 0),
    code: fallbackCode,
    contactTypeId: record.contactTypeId ?? null,
    ledgerId: record.ledgerId ?? null,
    ledgerName: record.ledgerName ?? null,
    name: fallbackName,
    legalName: record.legalName ?? null,
    pan: record.pan ?? null,
    gstin: record.gstin ?? null,
    msmeType: record.msmeType ?? null,
    msmeNo: record.msmeNo ?? null,
    tan: record.tan ?? null,
    tdsAvailable: Boolean(record.tdsAvailable),
    tcsAvailable: Boolean(record.tcsAvailable),
    openingBalance: Number(record.openingBalance ?? 0),
    balanceType: record.balanceType ?? null,
    creditLimit: Number(record.creditLimit ?? 0),
    website: record.website ?? null,
    description: record.description ?? null,
    primaryEmail: record.primaryEmail ?? null,
    primaryPhone: record.primaryPhone ?? null,
    isActive: record.isActive !== false,
    createdAt: String(record.createdAt ?? record.created_at ?? ""),
    updatedAt: String(record.updatedAt ?? record.updated_at ?? ""),
    deletedAt: nullableString(record.deletedAt ?? record.deleted_at),
    addresses: Array.isArray(record.addresses) ? record.addresses : [],
    emails: Array.isArray(record.emails) ? record.emails : [],
    phones: Array.isArray(record.phones) ? record.phones : [],
    socialLinks: Array.isArray(record.socialLinks) ? record.socialLinks : [],
    bankAccounts: Array.isArray(record.bankAccounts) ? record.bankAccounts : [],
    gstDetails: Array.isArray(record.gstDetails) ? record.gstDetails : [],
  }
}

function nullableString(value: unknown) {
  return value === null || value === undefined ? null : String(value)
}
