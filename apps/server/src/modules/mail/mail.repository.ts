import { type Kysely } from 'kysely'
import { BadRequestException, NotFoundException } from '../../core/exceptions/http.exception.js'
import { Injectable } from '../../core/decorators/injectable.js'
import type { TenantRuntimeContext } from '../../core/tenant/tenant-context.service.js'
import { dispatchPublicUuid } from '../../shared/helpers/public-uuid.js'
import { defaultMailSettings } from './mail-defaults.js'
import type { MailAttachment, MailAttachmentInput, MailEvent, MailMessage, MailMessageStatus, MailSettings, MailSettingsInput } from './mail.types.js'

type DynamicDatabase = Record<string, Record<string, unknown>>

@Injectable()
export class MailRepository {
  async settings(context: TenantRuntimeContext) {
    const companyId = await this.defaultCompanyId(context)
    const row = await this.database(context)
      .selectFrom('mail_settings')
      .selectAll()
      .where('company_id', '=', companyId)
      .executeTakeFirst()
    const fallback = defaultMailSettings(context, companyId)

    return row ? toSettings(row, fallback) : fallback
  }

  async saveSettings(context: TenantRuntimeContext, input: MailSettingsInput) {
    const companyId = await this.defaultCompanyId(context)
    const current = await this.settings(context)
    const row = {
      tenant_id: context.tenant.id,
      company_id: companyId,
      provider: clean(input.provider) || current.provider || 'smtp',
      host: clean(input.host),
      port: normalizePort(input.port),
      secure: Boolean(input.secure),
      username: clean(input.username),
      password_secret: input.password === '********' ? current.password : String(input.password ?? current.password ?? ''),
      from_email: clean(input.fromEmail),
      from_name: clean(input.fromName) || null,
      reply_to: clean(input.replyTo) || null,
      enabled: Boolean(input.enabled),
      updated_by: context.user.email,
      updated_at: new Date(),
    }

    if (!row.host && row.enabled) throw new BadRequestException('SMTP host is required before enabling mail.')
    if (!row.from_email && row.enabled) throw new BadRequestException('From email is required before enabling mail.')

    if (current.id) {
      await this.database(context).updateTable('mail_settings').set(row).where('id', '=', current.id).execute()
    } else {
      await this.database(context).insertInto('mail_settings').values({ ...row, uuid: dispatchPublicUuid() }).execute()
    }

    return this.settings(context)
  }

  async list(context: TenantRuntimeContext, query: { status?: string; search?: string; limit?: string }) {
    const limit = Math.min(Math.max(Number(query.limit) || 50, 1), 200)
    let builder = this.database(context)
      .selectFrom('mail_messages')
      .selectAll()
      .where('tenant_id', '=', context.tenant.id)
      .where('deleted_at', 'is', null)

    if (query.status && query.status !== 'all') builder = builder.where('status', '=', query.status)
    if (query.search?.trim()) {
      const search = `%${query.search.trim()}%`
      builder = builder.where((eb) => eb.or([
        eb('message_no', 'like', search),
        eb('subject', 'like', search),
        eb('from_email', 'like', search),
      ]))
    }

    const rows = await builder.orderBy('created_at', 'desc').limit(limit).execute()
    return Promise.all(rows.map((row) => this.messageFromRow(context, row)))
  }

  async find(context: TenantRuntimeContext, idOrUuid: string | number) {
    const row = await this.database(context)
      .selectFrom('mail_messages')
      .selectAll()
      .where('tenant_id', '=', context.tenant.id)
      .where(idColumn(String(idOrUuid)), '=', idValue(String(idOrUuid)))
      .where('deleted_at', 'is', null)
      .executeTakeFirst()

    return row ? this.messageFromRow(context, row) : null
  }

  async createOutbound(context: TenantRuntimeContext, input: {
    fromEmail: string
    fromName: string | null
    replyTo: string | null
    to: string[]
    cc: string[]
    bcc: string[]
    subject: string
    bodyText: string | null
    bodyHtml: string | null
    status: MailMessageStatus
    attachments: MailAttachmentInput[]
  }) {
    const subject = input.subject.trim()
    if (!subject) throw new BadRequestException('Subject is required.')
    if (!input.to.length && !input.cc.length && !input.bcc.length) throw new BadRequestException('At least one recipient is required.')

    const result = await this.database(context)
      .insertInto('mail_messages')
      .values({
        uuid: dispatchPublicUuid(),
        tenant_id: context.tenant.id,
        company_id: await this.defaultCompanyId(context),
        message_no: await this.nextMessageNo(context),
        direction: 'outbound',
        status: input.status,
        from_email: input.fromEmail,
        from_name: input.fromName,
        reply_to: input.replyTo,
        to_json: JSON.stringify(input.to),
        cc_json: JSON.stringify(input.cc),
        bcc_json: JSON.stringify(input.bcc),
        subject,
        body_text: input.bodyText,
        body_html: input.bodyHtml,
        queued_at: input.status === 'queued' ? new Date() : null,
        created_by: context.user.email,
      })
      .executeTakeFirst()

    const messageId = Number(result.insertId)
    for (const attachment of input.attachments) {
      await this.addAttachment(context, messageId, attachment)
    }
    await this.addEvent(context, messageId, input.status === 'draft' ? 'drafted' : 'queued', input.status === 'draft' ? 'Mail saved as draft.' : 'Mail queued for delivery.', {})

    const message = await this.find(context, messageId)
    if (!message) throw new NotFoundException('Mail message was not created.')
    return message
  }

  async markStatus(context: TenantRuntimeContext, idOrUuid: string | number, status: MailMessageStatus, input: { error?: string | null; providerMessageId?: string | null } = {}) {
    const message = await this.find(context, idOrUuid)
    if (!message) throw new NotFoundException('Mail message was not found.')
    await this.database(context)
      .updateTable('mail_messages')
      .set({
        status,
        provider_message_id: input.providerMessageId ?? message.provider_message_id,
        sent_at: status === 'sent' ? new Date() : message.sent_at,
        failed_at: status === 'failed' ? new Date() : null,
        error: status === 'failed' ? input.error ?? 'Mail delivery failed.' : null,
        updated_at: new Date(),
      })
      .where('id', '=', message.id)
      .execute()
    await this.addEvent(context, message.id, status, status === 'sent' ? 'Mail sent.' : status === 'failed' ? 'Mail failed.' : `Mail status changed to ${status}.`, input)
    return this.find(context, message.id)
  }

  async attachmentContents(context: TenantRuntimeContext, messageId: number) {
    return this.database(context)
      .selectFrom('mail_attachments')
      .selectAll()
      .where('mail_message_id', '=', messageId)
      .orderBy('id', 'asc')
      .execute()
  }

  async addEvent(context: TenantRuntimeContext, messageId: number, eventType: string, message: string, payload: unknown) {
    await this.database(context)
      .insertInto('mail_events')
      .values({
        uuid: dispatchPublicUuid(),
        mail_message_id: messageId,
        event_type: eventType,
        actor_email: context.user.email,
        message,
        payload: JSON.stringify(payload ?? {}),
      })
      .execute()
  }

  private async addAttachment(context: TenantRuntimeContext, messageId: number, input: MailAttachmentInput) {
    const base64 = cleanBase64(input.base64)
    const sizeBytes = Buffer.from(base64, 'base64').length
    await this.database(context)
      .insertInto('mail_attachments')
      .values({
        uuid: dispatchPublicUuid(),
        mail_message_id: messageId,
        file_name: cleanFileName(input.fileName),
        mime_type: clean(input.mimeType) || 'application/octet-stream',
        size_bytes: sizeBytes,
        content_base64: base64,
      })
      .execute()
  }

  private async messageFromRow(context: TenantRuntimeContext, row: Record<string, unknown>): Promise<MailMessage> {
    const attachments = await this.database(context).selectFrom('mail_attachments').selectAll().where('mail_message_id', '=', Number(row.id)).orderBy('id', 'asc').execute()
    const events = await this.database(context).selectFrom('mail_events').selectAll().where('mail_message_id', '=', Number(row.id)).orderBy('id', 'desc').execute()
    return {
      id: Number(row.id),
      uuid: String(row.uuid),
      tenant_id: Number(row.tenant_id),
      company_id: numberOrNull(row.company_id),
      message_no: String(row.message_no),
      direction: String(row.direction),
      status: statusValue(row.status),
      from_email: String(row.from_email),
      from_name: stringOrNull(row.from_name),
      reply_to: stringOrNull(row.reply_to),
      to_json: parseStringArray(row.to_json),
      cc_json: parseStringArray(row.cc_json),
      bcc_json: parseStringArray(row.bcc_json),
      subject: String(row.subject),
      body_text: stringOrNull(row.body_text),
      body_html: stringOrNull(row.body_html),
      provider_message_id: stringOrNull(row.provider_message_id),
      queued_at: dateOrNull(row.queued_at),
      sent_at: dateOrNull(row.sent_at),
      failed_at: dateOrNull(row.failed_at),
      error: stringOrNull(row.error),
      created_by: String(row.created_by),
      created_at: row.created_at as Date,
      updated_at: row.updated_at as Date,
      attachments: attachments.map(toAttachment),
      events: events.map(toEvent),
    }
  }

  private async defaultCompanyId(context: TenantRuntimeContext) {
    const company = await this.database(context).selectFrom('companies').select('id').where('tenant_id', '=', context.tenant.id).where('is_primary', '=', true).executeTakeFirst()
    return Number(company?.id ?? 0) || null
  }

  private async nextMessageNo(context: TenantRuntimeContext) {
    const row = await this.database(context).selectFrom('mail_messages').select('message_no').where('tenant_id', '=', context.tenant.id).orderBy('id', 'desc').executeTakeFirst()
    const next = (Number(String(row?.message_no ?? '').match(/(\d+)$/)?.[1] ?? 0) || 0) + 1
    return `MAIL-${new Date().getFullYear()}-${String(next).padStart(5, '0')}`
  }

  private database(context: TenantRuntimeContext) {
    return context.database as unknown as Kysely<DynamicDatabase>
  }
}

function toSettings(row: Record<string, unknown>, fallback: MailSettings): MailSettings {
  return {
    id: Number(row.id),
    uuid: String(row.uuid),
    tenant_id: Number(row.tenant_id),
    company_id: numberOrNull(row.company_id),
    provider: String(row.provider || fallback.provider || 'smtp'),
    host: String(row.host || fallback.host || ''),
    port: normalizePort(row.port || fallback.port),
    secure: row.secure === null || row.secure === undefined ? fallback.secure : Boolean(row.secure),
    username: String(row.username || fallback.username || ''),
    password: String(row.password_secret || fallback.password || ''),
    from_email: String(row.from_email || fallback.from_email || ''),
    from_name: stringOrNull(row.from_name) ?? fallback.from_name,
    reply_to: stringOrNull(row.reply_to) ?? fallback.reply_to,
    enabled: Boolean(row.enabled),
    updated_by: stringOrNull(row.updated_by),
    updated_at: row.updated_at as Date,
  }
}

function toAttachment(row: Record<string, unknown>): MailAttachment {
  return {
    id: Number(row.id),
    uuid: String(row.uuid),
    mail_message_id: Number(row.mail_message_id),
    file_name: String(row.file_name),
    mime_type: String(row.mime_type),
    size_bytes: Number(row.size_bytes ?? 0),
    created_at: row.created_at as Date,
  }
}

function toEvent(row: Record<string, unknown>): MailEvent {
  return {
    id: Number(row.id),
    uuid: String(row.uuid),
    mail_message_id: Number(row.mail_message_id),
    event_type: String(row.event_type),
    actor_email: String(row.actor_email),
    message: String(row.message),
    payload: String(row.payload ?? '{}'),
    created_at: row.created_at as Date,
  }
}

function statusValue(value: unknown): MailMessageStatus {
  return value === 'queued' || value === 'sending' || value === 'sent' || value === 'failed' || value === 'cancelled' ? value : 'draft'
}

function idColumn(idOrUuid: string) {
  return /^\d+$/.test(idOrUuid) && idOrUuid.length !== 8 ? 'id' : 'uuid'
}

function idValue(idOrUuid: string) {
  return idColumn(idOrUuid) === 'id' ? Number(idOrUuid) : idOrUuid
}

function parseStringArray(value: unknown) {
  try {
    const parsed = typeof value === 'string' ? JSON.parse(value) : value
    return Array.isArray(parsed) ? parsed.map(String).filter(Boolean) : []
  } catch {
    return []
  }
}

function clean(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function cleanBase64(value: string) {
  return clean(value).includes(',') ? clean(value).split(',').at(-1) ?? '' : clean(value)
}

function cleanFileName(value: string) {
  return clean(value).replace(/[/\\?%*:|"<>]/g, '-') || 'attachment.bin'
}

function normalizePort(value: unknown) {
  const port = Number(value ?? 587)
  return Number.isInteger(port) && port > 0 ? port : 587
}

function stringOrNull(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function numberOrNull(value: unknown) {
  const number = Number(value)
  return Number.isFinite(number) && number > 0 ? number : null
}

function dateOrNull(value: unknown) {
  if (!value) return null
  return value instanceof Date ? value : new Date(String(value))
}
