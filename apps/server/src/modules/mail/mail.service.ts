import { Inject } from '../../core/decorators/inject.js'
import { Injectable } from '../../core/decorators/injectable.js'
import { BadRequestException, NotFoundException } from '../../core/exceptions/http.exception.js'
import { TenantContextService, type TenantRequestHeaders } from '../../core/tenant/tenant-context.service.js'
import { MasterQueueService } from '../../infrastructure/queue/master-queue.service.js'
import { MailRepository } from './mail.repository.js'
import type { MailComposeInput, MailSettingsInput } from './mail.types.js'

@Injectable()
export class MailService {
  constructor(
    @Inject(() => TenantContextService) private readonly tenants: TenantContextService,
    @Inject(MailRepository) private readonly mail: MailRepository,
    @Inject(MasterQueueService) private readonly queue: MasterQueueService,
  ) {}

  async settings(headers: TenantRequestHeaders) {
    const context = await this.tenants.resolve(headers, 'mail.manage')
    return sanitizeSettings(await this.mail.settings(context))
  }

  async saveSettings(headers: TenantRequestHeaders, input: MailSettingsInput) {
    const context = await this.tenants.resolve(headers, 'mail.manage')
    return sanitizeSettings(await this.mail.saveSettings(context, input ?? {}))
  }

  async list(headers: TenantRequestHeaders, query: { status?: string; search?: string; limit?: string }) {
    const context = await this.tenants.resolve(headers, 'mail.manage')
    return this.mail.list(context, query ?? {})
  }

  async get(headers: TenantRequestHeaders, idOrUuid: string) {
    const context = await this.tenants.resolve(headers, 'mail.manage')
    const message = await this.mail.find(context, idOrUuid)
    if (!message) throw new NotFoundException('Mail message was not found.')
    return message
  }

  async compose(headers: TenantRequestHeaders, input: MailComposeInput) {
    const context = await this.tenants.resolve(headers, 'mail.manage')
    const settings = await this.mail.settings(context)
    if (!input?.saveAsDraft && !settings.enabled) throw new BadRequestException('Mail settings are not enabled for this tenant.')
    const message = await this.mail.createOutbound(context, {
      fromEmail: settings.from_email || context.user.email,
      fromName: settings.from_name,
      replyTo: settings.reply_to,
      to: normalizeEmails(input?.to),
      cc: normalizeEmails(input?.cc),
      bcc: normalizeEmails(input?.bcc),
      subject: input?.subject ?? '',
      bodyText: cleanText(input?.bodyText),
      bodyHtml: cleanText(input?.bodyHtml),
      status: input?.saveAsDraft ? 'draft' : 'queued',
      attachments: Array.isArray(input?.attachments) ? input.attachments : [],
    })

    if (!input?.saveAsDraft) {
      await this.queue.enqueue({
        type: 'mail.send',
        payload: {
          tenantSlug: context.tenant.slug,
          tenantId: context.tenant.id,
          messageUuid: message.uuid,
          requestedBy: context.user.email,
        },
      })
    }

    return message
  }
}

function sanitizeSettings<T extends { password?: string }>(settings: T) {
  return {
    ...settings,
    password: settings.password ? '********' : '',
    passwordConfigured: Boolean(settings.password),
  }
}

function normalizeEmails(values: unknown) {
  return (Array.isArray(values) ? values : String(values ?? '').split(/[,\n;]/))
    .map((value) => String(value).trim().toLowerCase())
    .filter((value) => value.includes('@'))
}

function cleanText(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}
