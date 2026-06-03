import nodemailer from 'nodemailer'
import { getDatabase } from '../../infrastructure/database/connection.js'
import { getTenantDatabase } from '../../infrastructure/tenant-database/tenant-database.connection.js'
import type { Tenant } from '../../core/tenant/domain/tenant.types.js'
import { defaultMailTransportSettings } from './mail-defaults.js'

type DynamicDatabase = Record<string, Record<string, unknown>>

export async function dispatchQueuedMail(input: { tenantSlug?: unknown; messageUuid?: unknown; requestedBy?: unknown }) {
  const tenantSlug = String(input.tenantSlug ?? '').trim()
  const messageUuid = String(input.messageUuid ?? '').trim()
  if (!tenantSlug || !messageUuid) throw new Error('Mail queue payload requires tenantSlug and messageUuid.')

  const tenant = await getDatabase().selectFrom('tenants').selectAll().where('slug', '=', tenantSlug).executeTakeFirst()
  if (!tenant) throw new Error(`Tenant not found for mail job: ${tenantSlug}`)

  const database = getTenantDatabase(tenant as Tenant) as unknown as import('kysely').Kysely<DynamicDatabase>
  const message = await database.selectFrom('mail_messages').selectAll().where('uuid', '=', messageUuid).executeTakeFirst()
  if (!message) throw new Error(`Mail message not found: ${messageUuid}`)
  if (String(message.status) === 'sent') return { ok: true, alreadySent: true, messageUuid }

  const messageCompanyId = Number(message.company_id ?? 0) || null
  const settingsQuery = database.selectFrom('mail_settings').selectAll()
  const savedSettings = messageCompanyId
    ? await settingsQuery.where('company_id', '=', messageCompanyId).executeTakeFirst()
    : await settingsQuery.where('company_id', 'is', null).executeTakeFirst()
  const fallbackSettings = defaultMailTransportSettings()
  const settings = savedSettings ? mergeTransportSettings(savedSettings, fallbackSettings) : fallbackSettings
  if (!settings || !settings.enabled) throw new Error('Tenant mail settings are not enabled.')

  await database.updateTable('mail_messages').set({ status: 'sending', updated_at: new Date() }).where('id', '=', Number(message.id)).execute()
  try {
    const attachments = await database.selectFrom('mail_attachments').selectAll().where('mail_message_id', '=', Number(message.id)).orderBy('id', 'asc').execute()
    const transporter = nodemailer.createTransport({
      host: String(settings.host),
      port: Number(settings.port ?? 587),
      secure: Boolean(settings.secure),
      auth: settings.username ? { user: String(settings.username), pass: String(settings.password_secret ?? '') } : undefined,
    })
    const result = await transporter.sendMail({
      from: formatAddress(String(message.from_email), stringOrNull(message.from_name)),
      to: parseArray(message.to_json),
      cc: parseArray(message.cc_json),
      bcc: parseArray(message.bcc_json),
      replyTo: stringOrNull(message.reply_to) ?? undefined,
      subject: String(message.subject),
      text: stringOrNull(message.body_text) ?? undefined,
      html: stringOrNull(message.body_html) ?? undefined,
      attachments: attachments.map((attachment) => ({
        filename: String(attachment.file_name),
        contentType: String(attachment.mime_type),
        content: Buffer.from(String(attachment.content_base64 ?? ''), 'base64'),
      })),
    })

    await database.updateTable('mail_messages').set({
      status: 'sent',
      provider_message_id: result.messageId ?? null,
      sent_at: new Date(),
      failed_at: null,
      error: null,
      updated_at: new Date(),
    }).where('id', '=', Number(message.id)).execute()
    await addEvent(database, Number(message.id), 'sent', String(input.requestedBy ?? 'mail-worker'), 'Mail sent through SMTP.', { messageId: result.messageId })
    return { ok: true, messageUuid, providerMessageId: result.messageId ?? null }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    await database.updateTable('mail_messages').set({
      status: 'failed',
      failed_at: new Date(),
      error: errorMessage,
      updated_at: new Date(),
    }).where('id', '=', Number(message.id)).execute()
    await addEvent(database, Number(message.id), 'failed', String(input.requestedBy ?? 'mail-worker'), 'Mail delivery failed.', { error: errorMessage })
    throw error
  }
}

async function addEvent(database: import('kysely').Kysely<DynamicDatabase>, messageId: number, eventType: string, actorEmail: string, message: string, payload: unknown) {
  const { dispatchPublicUuid } = await import('../../shared/helpers/public-uuid.js')
  await database.insertInto('mail_events').values({
    uuid: dispatchPublicUuid(),
    mail_message_id: messageId,
    event_type: eventType,
    actor_email: actorEmail,
    message,
    payload: JSON.stringify(payload ?? {}),
  }).execute()
}

function parseArray(value: unknown) {
  try {
    const parsed = typeof value === 'string' ? JSON.parse(value) : value
    return Array.isArray(parsed) ? parsed.map(String).filter(Boolean) : []
  } catch {
    return []
  }
}

function stringOrNull(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function formatAddress(email: string, name: string | null) {
  return name ? { address: email, name } : email
}

function mergeTransportSettings(saved: Record<string, unknown>, fallback: ReturnType<typeof defaultMailTransportSettings>) {
  return {
    enabled: Boolean(saved.enabled),
    host: String(saved.host || fallback.host || ''),
    port: Number(saved.port || fallback.port || 465),
    secure: saved.secure === null || saved.secure === undefined ? fallback.secure : Boolean(saved.secure),
    username: String(saved.username || fallback.username || ''),
    password_secret: String(saved.password_secret || fallback.password_secret || ''),
  }
}
