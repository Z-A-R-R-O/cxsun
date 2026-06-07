import { apiBaseUrl, authHeaders, type AuthSession } from "src/features/auth/auth-client"

export type CredentialServiceKey = "gst" | "einvoice" | "eway" | "einvoiceApi" | "ewayApi" | "emailAccount"

export interface AuditorContactCredentialRecord {
  id: number
  uuid: string
  contactId: number
  contactName: string
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
}

export type AuditorContactCredentialInput = Omit<AuditorContactCredentialRecord, "id" | "uuid" | "contactName"> & {
  id?: number
  uuid?: string
  contactName?: string
}

type RawCredential = Partial<AuditorContactCredentialRecord> & {
  [key: string]: unknown
  contact_id?: unknown
  contact_name?: unknown
  gst_user?: unknown
  gst_pass?: unknown
  einvoice_user?: unknown
  einvoice_pass?: unknown
  eway_user?: unknown
  eway_pass?: unknown
  einvoice_api_user?: unknown
  einvoice_api_pass?: unknown
  eway_api_user?: unknown
  eway_api_pass?: unknown
  email_account_user?: unknown
  email_account_pass?: unknown
  is_active?: unknown
}

export async function listAuditorContactCredentials(session: AuthSession) {
  const response = await fetch(`${apiBaseUrl}/api/v1/auditor/contact-credentials`, { cache: "no-store", headers: authHeaders(session) })
  if (!response.ok) throw new Error(`Contact credential list failed with status ${response.status}.`)
  return ((await response.json()) as RawCredential[]).map(normalizeCredential)
}

export async function upsertAuditorContactCredential(session: AuthSession, input: AuditorContactCredentialInput) {
  const response = await fetch(`${apiBaseUrl}/api/v1/auditor/contact-credentials/upsert`, {
    body: JSON.stringify(input),
    cache: "no-store",
    headers: { ...authHeaders(session), "Content-Type": "application/json" },
    method: "POST",
  })
  if (!response.ok) throw new Error(await responseError(response, `Contact credential save failed with status ${response.status}.`))
  const result = await response.json() as { ok: boolean; record?: RawCredential; error?: string }
  if (!result.ok || !result.record) throw new Error(result.error ?? "Contact credential save failed.")
  return normalizeCredential(result.record)
}

export function emptyCredential(contactId: number): AuditorContactCredentialInput {
  return {
    contactId,
    gstUser: "",
    gstPass: "",
    einvoiceUser: "",
    einvoicePass: "",
    ewayUser: "",
    ewayPass: "",
    einvoiceApiUser: "",
    einvoiceApiPass: "",
    ewayApiUser: "",
    ewayApiPass: "",
    emailAccountUser: "",
    emailAccountPass: "",
    isActive: true,
  }
}

export function normalizeCredential(record: RawCredential): AuditorContactCredentialRecord {
  return {
    id: Number(record.id ?? 0),
    uuid: String(record.uuid ?? ""),
    contactId: Number(record.contactId ?? record.contact_id ?? 0),
    contactName: String(record.contactName ?? record.contact_name ?? ""),
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
    const body = await response.json() as { error?: string; message?: string }
    return body.error ?? body.message ?? fallback
  } catch {
    return fallback
  }
}
