import { apiBaseUrl, authHeaders, type AuthSession } from "src/features/auth/auth-client"

export interface AuditorClientRecord {
  id: number
  uuid: string
  name: string
  group: string | null
  contactPerson: string | null
  mobile: string | null
  whatsapp: string | null
  email: string | null
  gstin: string | null
  addressLine1: string | null
  addressLine2: string | null
  cityId: string | null
  city: string | null
  stateId: string | null
  state: string | null
  pincodeId: string | null
  pincode: string | null
  gstUser: string | null
  gstPass: string | null
  einvoiceUser: string | null
  einvoicePass: string | null
  ewayUser: string | null
  ewayPass: string | null
  einvoiceApiUser: string | null
  einvoiceApiPass: string | null
  ewayApiUser: string | null
  ewayApiPass: string | null
  emailAccountUser: string | null
  emailAccountPass: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
  deletedAt: string | null
}

export interface AuditorClientInput {
  id?: number
  uuid?: string
  name: string
  group: string
  contactPerson: string
  mobile: string
  whatsapp: string
  email: string
  gstin: string
  addressLine1: string
  addressLine2: string
  cityId: string
  city: string
  stateId: string
  state: string
  pincodeId: string
  pincode: string
  gstUser: string
  gstPass: string
  einvoiceUser: string
  einvoicePass: string
  ewayUser: string
  ewayPass: string
  einvoiceApiUser: string
  einvoiceApiPass: string
  ewayApiUser: string
  ewayApiPass: string
  emailAccountUser: string
  emailAccountPass: string
  isActive: boolean
}

type RawAuditorClient = Partial<AuditorClientRecord> & {
  [key: string]: unknown
  group_name?: unknown
  is_active?: unknown
  created_at?: unknown
  updated_at?: unknown
  deleted_at?: unknown
}

export function emptyAuditorClient(): AuditorClientInput {
  return {
    name: "", group: "", contactPerson: "", mobile: "", whatsapp: "", email: "", gstin: "",
    addressLine1: "", addressLine2: "", cityId: "", city: "", stateId: "", state: "", pincodeId: "", pincode: "",
    gstUser: "", gstPass: "", einvoiceUser: "", einvoicePass: "", ewayUser: "", ewayPass: "",
    einvoiceApiUser: "", einvoiceApiPass: "", ewayApiUser: "", ewayApiPass: "",
    emailAccountUser: "", emailAccountPass: "", isActive: true,
  }
}

export async function listAuditorClients(session: AuthSession) {
  const response = await fetch(`${apiBaseUrl}/api/v1/auditor/clients`, { cache: "no-store", headers: authHeaders(session) })
  if (!response.ok) throw new Error(`Auditor client list failed with status ${response.status}.`)
  return ((await response.json()) as RawAuditorClient[]).map(normalizeAuditorClient)
}

export async function upsertAuditorClient(session: AuthSession, input: AuditorClientInput) {
  const response = await fetch(`${apiBaseUrl}/api/v1/auditor/clients/upsert`, {
    body: JSON.stringify(input),
    cache: "no-store",
    headers: { ...authHeaders(session), "Content-Type": "application/json" },
    method: "POST",
  })
  if (!response.ok) throw new Error(await responseError(response, `Auditor client save failed with status ${response.status}.`))
  const result = (await response.json()) as { ok: boolean; record?: RawAuditorClient; error?: string }
  if (!result.ok || !result.record) throw new Error(result.error ?? "Auditor client save failed.")
  return normalizeAuditorClient(result.record)
}

export async function suspendAuditorClient(session: AuthSession, record: AuditorClientRecord) {
  return mutateAuditorClient(session, record.uuid, "destroy")
}

export async function restoreAuditorClient(session: AuthSession, record: AuditorClientRecord) {
  return mutateAuditorClient(session, record.uuid, "restore")
}

async function mutateAuditorClient(session: AuthSession, uuid: string, action: "destroy" | "restore") {
  const response = await fetch(`${apiBaseUrl}/api/v1/auditor/clients/${encodeURIComponent(uuid)}/${action}`, {
    body: "{}",
    cache: "no-store",
    headers: { ...authHeaders(session), "Content-Type": "application/json" },
    method: "POST",
  })
  if (!response.ok) throw new Error(await responseError(response, `Auditor client ${action} failed.`))
}

function normalizeAuditorClient(record: RawAuditorClient): AuditorClientRecord {
  return {
    id: Number(record.id ?? 0),
    uuid: String(record.uuid ?? ""),
    name: String(record.name ?? ""),
    group: nullableString(record.group ?? record.group_name),
    contactPerson: nullableString(record.contactPerson ?? record.contact_person),
    mobile: nullableString(record.mobile),
    whatsapp: nullableString(record.whatsapp),
    email: nullableString(record.email),
    gstin: nullableString(record.gstin),
    addressLine1: nullableString(record.addressLine1 ?? record.address_line_1),
    addressLine2: nullableString(record.addressLine2 ?? record.address_line_2),
    cityId: nullableString(record.cityId ?? record.city_id),
    city: nullableString(record.city),
    stateId: nullableString(record.stateId ?? record.state_id),
    state: nullableString(record.state),
    pincodeId: nullableString(record.pincodeId ?? record.pincode_id),
    pincode: nullableString(record.pincode),
    gstUser: nullableString(record.gstUser ?? record.gst_user),
    gstPass: nullableString(record.gstPass ?? record.gst_pass),
    einvoiceUser: nullableString(record.einvoiceUser ?? record.einvoice_user),
    einvoicePass: nullableString(record.einvoicePass ?? record.einvoice_pass),
    ewayUser: nullableString(record.ewayUser ?? record.eway_user),
    ewayPass: nullableString(record.ewayPass ?? record.eway_pass),
    einvoiceApiUser: nullableString(record.einvoiceApiUser ?? record.einvoice_api_user),
    einvoiceApiPass: nullableString(record.einvoiceApiPass ?? record.einvoice_api_pass),
    ewayApiUser: nullableString(record.ewayApiUser ?? record.eway_api_user),
    ewayApiPass: nullableString(record.ewayApiPass ?? record.eway_api_pass),
    emailAccountUser: nullableString(record.emailAccountUser ?? record.email_account_user),
    emailAccountPass: nullableString(record.emailAccountPass ?? record.email_account_pass),
    isActive: booleanValue(record.isActive ?? record.is_active, true),
    createdAt: String(record.createdAt ?? record.created_at ?? ""),
    updatedAt: String(record.updatedAt ?? record.updated_at ?? ""),
    deletedAt: nullableString(record.deletedAt ?? record.deleted_at),
  }
}

function nullableString(value: unknown) {
  return value === null || value === undefined || value === "" ? null : String(value)
}

function booleanValue(value: unknown, fallback = false) {
  if (value === null || value === undefined || value === "") return fallback
  if (typeof value === "string") return value !== "0" && value.toLowerCase() !== "false"
  return Boolean(value)
}

async function responseError(response: Response, fallback: string) {
  try {
    const body = await response.json() as { error?: string }
    return body.error ?? fallback
  } catch {
    return fallback
  }
}
