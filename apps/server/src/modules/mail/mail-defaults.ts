import { settings } from '../../framework/config/index.js'
import type { TenantRuntimeContext } from '../../core/tenant/tenant-context.service.js'
import type { MailSettings } from './mail.types.js'

export function defaultMailSettings(context: TenantRuntimeContext, companyId: number | null): MailSettings {
  return {
    tenant_id: context.tenant.id,
    company_id: companyId,
    provider: settings.mail.provider || 'smtp',
    host: settings.mail.smtpHost,
    port: settings.mail.smtpPort,
    secure: settings.mail.smtpSecure,
    username: settings.mail.username,
    password: settings.mail.password,
    from_email: settings.mail.fromEmail || settings.mail.username,
    from_name: settings.mail.fromName ?? null,
    reply_to: settings.mail.replyTo ?? null,
    enabled: settings.mail.enabled && Boolean(settings.mail.smtpHost && (settings.mail.fromEmail || settings.mail.username)),
    updated_by: null,
  }
}

export function defaultMailTransportSettings() {
  return {
    enabled: settings.mail.enabled && Boolean(settings.mail.smtpHost && (settings.mail.fromEmail || settings.mail.username)),
    host: settings.mail.smtpHost,
    port: settings.mail.smtpPort,
    secure: settings.mail.smtpSecure,
    username: settings.mail.username,
    password_secret: settings.mail.password,
  }
}
