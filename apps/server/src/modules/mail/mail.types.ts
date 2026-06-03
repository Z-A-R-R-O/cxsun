export type MailMessageStatus = 'draft' | 'queued' | 'sending' | 'sent' | 'failed' | 'cancelled'

export interface MailSettings {
  id?: number
  uuid?: string
  tenant_id: number
  company_id: number | null
  provider: string
  host: string
  port: number
  secure: boolean
  username: string
  password: string
  from_email: string
  from_name: string | null
  reply_to: string | null
  enabled: boolean
  updated_by: string | null
  updated_at?: Date
}

export interface MailAttachmentInput {
  fileName: string
  mimeType?: string
  base64: string
}

export interface MailComposeInput {
  to: string[]
  cc?: string[]
  bcc?: string[]
  subject: string
  bodyText?: string
  bodyHtml?: string
  attachments?: MailAttachmentInput[]
  saveAsDraft?: boolean
}

export interface MailSettingsInput {
  provider?: string
  host?: string
  port?: number
  secure?: boolean
  username?: string
  password?: string
  fromEmail?: string
  fromName?: string
  replyTo?: string
  enabled?: boolean
}

export interface MailMessage {
  id: number
  uuid: string
  tenant_id: number
  company_id: number | null
  message_no: string
  direction: string
  status: MailMessageStatus
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
  queued_at: Date | null
  sent_at: Date | null
  failed_at: Date | null
  error: string | null
  created_by: string
  created_at: Date
  updated_at: Date
  attachments?: MailAttachment[]
  events?: MailEvent[]
}

export interface MailAttachment {
  id: number
  uuid: string
  mail_message_id: number
  file_name: string
  mime_type: string
  size_bytes: number
  created_at: Date
}

export interface MailEvent {
  id: number
  uuid: string
  mail_message_id: number
  event_type: string
  actor_email: string
  message: string
  payload: string
  created_at: Date
}
