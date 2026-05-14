export const mailStatuses = ["queued", "processing", "sent", "failed", "cancelled"] as const;
export type MailStatus = (typeof mailStatuses)[number];

export const mailCategories = [
  "otp",
  "auth-recovery",
  "invoice",
  "report",
  "sync-alert",
  "queue-failure-alert",
  "worker-notification",
  "test",
  "generic-transactional",
] as const;
export type MailCategory = (typeof mailCategories)[number];

export const mailTemplateKeys = [
  "otp",
  "auth-recovery",
  "invoice",
  "report",
  "sync-alert",
  "queue-failure-alert",
  "worker-notification",
  "test",
  "generic-transactional",
] as const;
export type MailTemplateKey = (typeof mailTemplateKeys)[number];

export interface MailAddressRecord {
  readonly email: string;
  readonly name?: string | null;
}

export interface MailAttachmentRecord {
  readonly filename: string;
  readonly contentBase64?: string;
  readonly contentType?: string | null;
  readonly path?: string | null;
}

export interface MailLogRecord {
  readonly id: string;
  readonly tenantId: string | null;
  readonly companyId: string | null;
  readonly queueJobId: string | null;
  readonly templateKey: MailTemplateKey;
  readonly category: MailCategory;
  readonly subject: string;
  readonly previewText: string | null;
  readonly htmlBody: string;
  readonly textBody: string;
  readonly status: MailStatus;
  readonly fromEmail: string;
  readonly fromName: string | null;
  readonly replyTo: string | null;
  readonly to: readonly MailAddressRecord[];
  readonly cc: readonly MailAddressRecord[];
  readonly bcc: readonly MailAddressRecord[];
  readonly attachments: readonly MailAttachmentRecord[];
  readonly providerKind: string;
  readonly providerMessageId: string | null;
  readonly requestedByUserId: string | null;
  readonly sourceModule: string | null;
  readonly sourceRecordId: string | null;
  readonly lastError: string | null;
  readonly sentAt: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface MailDeliveryAttemptRecord {
  readonly id: string;
  readonly mailMessageId: string;
  readonly queueJobId: string | null;
  readonly attemptNo: number;
  readonly status: MailStatus;
  readonly providerResponse: Record<string, unknown>;
  readonly errorMessage: string | null;
  readonly startedAt: string;
  readonly finishedAt: string | null;
  readonly createdAt: string;
}

export interface MailTemplateRecord {
  readonly key: MailTemplateKey;
  readonly label: string;
  readonly category: MailCategory;
  readonly description: string;
}
