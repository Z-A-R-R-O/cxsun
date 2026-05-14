import type { MailCategory, MailTemplateKey, MailTemplateRecord } from "../../domain/mail-record";

export interface RenderedMailTemplate {
  readonly templateKey: MailTemplateKey;
  readonly category: MailCategory;
  readonly label: string;
  readonly subject: string;
  readonly previewText: string | null;
  readonly html: string;
  readonly text: string;
}

interface MailTemplateDefinition extends MailTemplateRecord {
  readonly subject: string;
  readonly previewText: string | null;
  readonly html: string;
  readonly text: string;
}

const templateDefinitions: readonly MailTemplateDefinition[] = [
  {
    key: "otp",
    label: "OTP",
    category: "otp",
    description: "One-time password for authentication.",
    subject: "{{appName}} verification code",
    previewText: "Use this verification code to continue.",
    html: "<p>Hello {{recipientName}},</p><p>Your verification code is <strong>{{otp}}</strong>.</p><p>This code expires soon.</p>",
    text: "Hello {{recipientName}}, your verification code is {{otp}}.",
  },
  {
    key: "auth-recovery",
    label: "Password recovery",
    category: "auth-recovery",
    description: "Password reset and account recovery mail.",
    subject: "Reset your {{appName}} password",
    previewText: "Use the secure link to choose a new password.",
    html: "<p>Hello {{recipientName}},</p><p>Use the link below to reset your password.</p><p><a href=\"{{resetLink}}\">Reset password</a></p>",
    text: "Hello {{recipientName}}, reset your password here: {{resetLink}}",
  },
  {
    key: "invoice",
    label: "Invoice delivery",
    category: "invoice",
    description: "Invoice mail with optional attachment metadata.",
    subject: "Invoice {{invoiceNumber}} from {{companyName}}",
    previewText: "Your invoice is ready.",
    html: "<p>Hello {{recipientName}},</p><p>Please find invoice <strong>{{invoiceNumber}}</strong> from {{companyName}} attached.</p>",
    text: "Hello {{recipientName}}, invoice {{invoiceNumber}} from {{companyName}} is attached.",
  },
  {
    key: "report",
    label: "Report delivery",
    category: "report",
    description: "Report mail with export delivery details.",
    subject: "{{reportName}} report from {{companyName}}",
    previewText: "Your requested report is ready.",
    html: "<p>Hello {{recipientName}},</p><p>Your {{reportName}} report is ready from {{companyName}}.</p>",
    text: "Hello {{recipientName}}, your {{reportName}} report is ready from {{companyName}}.",
  },
  {
    key: "sync-alert",
    label: "Sync alert",
    category: "sync-alert",
    description: "Operational alert for sync failures or degraded jobs.",
    subject: "Sync alert for {{companyName}}",
    previewText: "A sync operation needs attention.",
    html: "<p>Sync job <strong>{{jobName}}</strong> needs attention.</p><p>{{message}}</p>",
    text: "Sync job {{jobName}} needs attention. {{message}}",
  },
  {
    key: "queue-failure-alert",
    label: "Queue failure alert",
    category: "queue-failure-alert",
    description: "Operational alert for background queue failures.",
    subject: "Queue failure on {{appName}}",
    previewText: "A background job failed and may need retry.",
    html: "<p>Queue job <strong>{{jobName}}</strong> failed.</p><p>{{message}}</p>",
    text: "Queue job {{jobName}} failed. {{message}}",
  },
  {
    key: "worker-notification",
    label: "Worker notification",
    category: "worker-notification",
    description: "Worker lifecycle or maintenance notification.",
    subject: "Worker notification from {{appName}}",
    previewText: "A background worker has an update.",
    html: "<p>{{message}}</p>",
    text: "{{message}}",
  },
  {
    key: "test",
    label: "Test mail",
    category: "test",
    description: "Operator test mail for SMTP validation.",
    subject: "Test email from {{appName}}",
    previewText: "This confirms outbound mail is configured.",
    html: "<p>Hello {{recipientName}},</p><p>This is a test email from {{appName}} for {{companyName}}.</p>",
    text: "Hello {{recipientName}}, this is a test email from {{appName}} for {{companyName}}.",
  },
  {
    key: "generic-transactional",
    label: "Generic transactional",
    category: "generic-transactional",
    description: "Plain transactional email with custom message text.",
    subject: "{{subject}}",
    previewText: "{{previewText}}",
    html: "<p>Hello {{recipientName}},</p><p>{{message}}</p>",
    text: "Hello {{recipientName}}, {{message}}",
  },
] as const;

export class MailTemplateRenderer {
  public listTemplates(): readonly MailTemplateRecord[] {
    return templateDefinitions.map(({ key, label, category, description }) => ({
      key,
      label,
      category,
      description,
    }));
  }

  public render(templateKey: MailTemplateKey, variables: Record<string, unknown>): RenderedMailTemplate {
    const definition = templateDefinitions.find((item) => item.key === templateKey);
    if (!definition) {
      throw new Error(`Unsupported mail template "${templateKey}".`);
    }

    const tokens = withDefaultVariables(variables);
    return {
      templateKey,
      category: definition.category,
      label: definition.label,
      subject: interpolate(definition.subject, tokens),
      previewText: definition.previewText ? interpolate(definition.previewText, tokens) : null,
      html: interpolate(definition.html, tokens),
      text: interpolate(definition.text, tokens),
    };
  }
}

function withDefaultVariables(variables: Record<string, unknown>) {
  return {
    appName: "CxNext",
    companyName: "Your company",
    recipientName: "there",
    otp: "123456",
    resetLink: "https://example.com/reset",
    invoiceNumber: "INV-001",
    reportName: "Summary",
    jobName: "background-job",
    message: "Everything is running normally.",
    previewText: "Transactional notification",
    subject: "Transactional notification",
    ...variables,
  };
}

function interpolate(template: string, variables: Record<string, unknown>) {
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_match, token) => {
    const value = variables[token];
    return value === null || value === undefined ? "" : String(value);
  });
}
