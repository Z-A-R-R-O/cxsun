import { apiBaseUrl, authHeaders, type AuthSession } from "src/features/auth/auth-client"

export interface MailSettings {
  tenant_id: number
  company_id: number | null
  provider: string
  host: string
  port: number
  secure: boolean
  username: string
  password: string
  passwordConfigured?: boolean
  from_email: string
  from_name: string | null
  reply_to: string | null
  enabled: boolean
  updated_by: string | null
  updated_at?: string
}

export interface MailAttachmentInput {
  fileName: string
  mimeType: string
  base64: string
}

export interface MailMessage {
  id: number
  uuid: string
  message_no: string
  status: "draft" | "queued" | "sending" | "sent" | "failed" | "cancelled"
  from_email: string
  from_name: string | null
  reply_to: string | null
  to_json: string[]
  cc_json: string[]
  bcc_json: string[]
  subject: string
  body_text: string | null
  body_html: string | null
  provider_message_id: string | null
  queued_at: string | null
  sent_at: string | null
  failed_at: string | null
  error: string | null
  created_by: string
  created_at: string
  updated_at: string
  attachments?: { id: number; uuid: string; file_name: string; mime_type: string; size_bytes: number; created_at: string }[]
  events?: { id: number; uuid: string; event_type: string; actor_email: string; message: string; payload: string; created_at: string }[]
}

export interface MailComposeInput {
  to: string[]
  cc: string[]
  bcc: string[]
  subject: string
  bodyText: string
  bodyHtml?: string
  attachments: MailAttachmentInput[]
  saveAsDraft?: boolean
}

export async function getMailSettings(session: AuthSession) {
  const response = await fetch(`${apiBaseUrl}/api/v1/mail/settings`, { cache: "no-store", headers: authHeaders(session) })
  if (!response.ok) throw new Error(`Mail settings failed with status ${response.status}.`)
  return (await response.json()) as MailSettings
}

export async function saveMailSettings(session: AuthSession, input: Partial<MailSettings>) {
  const response = await fetch(`${apiBaseUrl}/api/v1/mail/settings`, {
    body: JSON.stringify({
      provider: input.provider,
      host: input.host,
      port: input.port,
      secure: input.secure,
      username: input.username,
      password: input.password,
      fromEmail: input.from_email,
      fromName: input.from_name,
      replyTo: input.reply_to,
      enabled: input.enabled,
    }),
    cache: "no-store",
    headers: { ...authHeaders(session), "Content-Type": "application/json" },
    method: "PATCH",
  })
  if (!response.ok) throw new Error(`Mail settings save failed with status ${response.status}.`)
  return (await response.json()) as MailSettings
}

export async function listMailMessages(session: AuthSession, filters: { status?: string; search?: string } = {}) {
  const params = new URLSearchParams()
  if (filters.status && filters.status !== "all") params.set("status", filters.status)
  if (filters.search) params.set("search", filters.search)
  const response = await fetch(`${apiBaseUrl}/api/v1/mail/messages${params.size ? `?${params}` : ""}`, { cache: "no-store", headers: authHeaders(session) })
  if (!response.ok) throw new Error(`Mail list failed with status ${response.status}.`)
  return (await response.json()) as MailMessage[]
}

export async function sendMailMessage(session: AuthSession, input: MailComposeInput) {
  const response = await fetch(`${apiBaseUrl}/api/v1/mail/messages`, {
    body: JSON.stringify(input),
    cache: "no-store",
    headers: { ...authHeaders(session), "Content-Type": "application/json" },
    method: "POST",
  })
  if (!response.ok) throw new Error(`Mail send failed with status ${response.status}.`)
  return (await response.json()) as MailMessage
}

export function fileToMailAttachment(file: File) {
  return new Promise<MailAttachmentInput>((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(reader.error ?? new Error("Could not read attachment."))
    reader.onload = () => resolve({
      base64: String(reader.result ?? "").split(",").at(-1) ?? "",
      fileName: file.name,
      mimeType: file.type || "application/octet-stream",
    })
    reader.readAsDataURL(file)
  })
}
