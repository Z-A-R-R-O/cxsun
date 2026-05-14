import {
  BadRequestException,
  Injectable,
  NotFoundException,
  type OnModuleDestroy,
} from "@nestjs/common";
import { createDatabaseConnection, loadDatabaseEnv, type DatabaseConnection } from "@cxnext/db";
import type { Kysely } from "kysely";
import type Mail from "nodemailer/lib/mailer";
import type { AuthRequestContext } from "../../auth/interface/http/auth-context";
import { QueueService } from "../../queue/application/queue.service";
import type { QueueJobExecutionContext } from "../../queue/domain/queue-job-handler";
import type { QueueJobRecord, QueueJobStatus } from "../../queue/domain/queue-job-record";
import type {
  MailAttachmentRecord,
  MailCategory,
  MailDeliveryAttemptRecord,
  MailLogRecord,
  MailStatus,
  MailTemplateKey,
} from "../domain/mail-record";
import { mailCategories, mailStatuses, mailTemplateKeys } from "../domain/mail-record";
import { SmtpMailTransport } from "../infrastructure/providers/smtp-mail-transport";
import { MailTemplateRenderer } from "../infrastructure/templates/mail-template-renderer";

type DynamicDatabase = Record<string, Record<string, unknown>>;

interface MailLogFilters {
  readonly category?: MailCategory | null;
  readonly companyId?: string | null;
  readonly cursor?: string | null;
  readonly limit?: number;
  readonly search?: string | null;
  readonly status?: MailStatus | null;
}

interface CompanyMailSettingsRecord {
  readonly fromEmail: string;
  readonly fromName: string;
  readonly replyTo: string;
  readonly operationalRecipients: string;
}

interface MailTemplatePreviewInput {
  readonly companyId?: string | null;
  readonly variables?: Record<string, unknown>;
}

interface QueueableMailInput {
  readonly category: MailCategory;
  readonly templateKey: MailTemplateKey;
  readonly companyId?: string | null;
  readonly to: readonly { readonly email: string; readonly name?: string | null }[];
  readonly cc?: readonly { readonly email: string; readonly name?: string | null }[];
  readonly bcc?: readonly { readonly email: string; readonly name?: string | null }[];
  readonly replyTo?: string | null;
  readonly variables?: Record<string, unknown>;
  readonly attachments?: readonly MailAttachmentRecord[];
  readonly sourceModule?: string | null;
  readonly sourceRecordId?: string | null;
  readonly queuePriority?: number;
  readonly maxAttempts?: number;
}

@Injectable()
export class MailService implements OnModuleDestroy {
  private readonly connection: DatabaseConnection;
  private readonly transport = new SmtpMailTransport();
  private readonly templateRenderer = new MailTemplateRenderer();

  public constructor(private readonly queueService: QueueService) {
    this.connection = createDatabaseConnection(loadDatabaseEnv().env);
  }

  public async onModuleDestroy(): Promise<void> {
    await this.connection.destroy();
  }

  public async status(companyId?: string | null) {
    const transport = this.transport.status();
    const companySettings = companyId ? await this.getCompanyMailSettings(companyId) : emptyCompanyMailSettings();
    return {
      transport,
      sender: {
        defaultFromEmail: transport.defaultFromEmail,
        defaultFromName: transport.defaultFromName,
        companyFromEmail: companySettings.fromEmail || null,
        companyFromName: companySettings.fromName || null,
        companyReplyTo: companySettings.replyTo || null,
        operationalRecipients: parseEmails(companySettings.operationalRecipients),
      },
    };
  }

  public templates() {
    return this.templateRenderer.listTemplates();
  }

  public async previewTemplate(templateKey: MailTemplateKey, input: MailTemplatePreviewInput) {
    const company = input.companyId ? await this.getCompanySummary(input.companyId) : null;
    return this.templateRenderer.render(templateKey, {
      companyName: company?.name ?? "Your company",
      ...input.variables,
    });
  }

  public async testTransport(companyId: string | null | undefined, recipientEmail: string) {
    validateEmail(recipientEmail);
    const verification = await this.transport.verify();
    const queued = await this.enqueueMail(
      {
        category: "test",
        templateKey: "test",
        companyId,
        to: [{ email: recipientEmail, name: "Operator" }],
        variables: {
          recipientName: "Operator",
        },
      },
      null,
    );

    return {
      verification,
      queued,
    };
  }

  public async enqueueMail(input: QueueableMailInput, auth: AuthRequestContext | null) {
    const company = input.companyId ? await this.getCompanySummary(input.companyId) : null;
    const companySettings = input.companyId
      ? await this.getCompanyMailSettings(input.companyId)
      : emptyCompanyMailSettings();
    const resolvedTemplate = this.templateRenderer.render(input.templateKey, {
      companyName: company?.name ?? "Your company",
      ...input.variables,
    });
    const fromEmail = firstFilled(companySettings.fromEmail, this.transport.status().defaultFromEmail);
    if (!fromEmail) {
      throw new BadRequestException("SMTP from email is not configured.");
    }

    const to = normalizeMailAddressList(input.to);
    const cc = normalizeMailAddressList(input.cc ?? []);
    const bcc = normalizeMailAddressList(input.bcc ?? []);
    if (to.length === 0) {
      throw new BadRequestException("At least one recipient is required.");
    }

    const now = new Date();
    const inserted = await this.db()
      .insertInto("mail_messages")
      .values({
        tenant_id: company?.tenantId ? Number(company.tenantId) : null,
        company_id: input.companyId ? Number(input.companyId) : null,
        queue_job_id: null,
        template_key: input.templateKey,
        category: input.category,
        subject: resolvedTemplate.subject,
        preview_text: resolvedTemplate.previewText,
        html_body: resolvedTemplate.html,
        text_body: resolvedTemplate.text,
        status: "queued",
        from_email: fromEmail,
        from_name: firstFilled(companySettings.fromName, this.transport.status().defaultFromName),
        reply_to: firstFilled(input.replyTo, companySettings.replyTo),
        to_json: JSON.stringify(to),
        cc_json: JSON.stringify(cc),
        bcc_json: JSON.stringify(bcc),
        attachments_json: JSON.stringify(normalizeAttachments(input.attachments ?? [])),
        provider_kind: this.transport.status().mode,
        provider_message_id: null,
        requested_by_user_id: auth?.user.id ?? null,
        source_module: input.sourceModule ?? null,
        source_record_id: input.sourceRecordId ?? null,
        last_error: null,
        sent_at: null,
        created_at: now,
        updated_at: now,
      })
      .executeTakeFirstOrThrow();

    const mailMessageId = String(inserted.insertId ?? "");
    const job = await this.queueService.enqueue(
      {
        queueName: "mail",
        jobName: queueJobNameForCategory(input.category),
        companyId: input.companyId ?? null,
        maxAttempts: input.maxAttempts ?? 3,
        priority: input.queuePriority ?? 10,
        payload: { mailMessageId },
      },
      auth,
    );

    await this.db()
      .updateTable("mail_messages")
      .set({
        queue_job_id: Number(job.id),
        updated_at: new Date(),
      })
      .where("id", "=", Number(mailMessageId))
      .executeTakeFirst();

    return this.getLog(mailMessageId);
  }

  public async listLogs(filters: MailLogFilters) {
    const limit = normalizeLimit(filters.limit);
    const cursor = normalizeCursor(filters.cursor);
    let query = this.db()
      .selectFrom("mail_messages")
      .selectAll()
      .orderBy("id", "desc")
      .limit(limit + 1);

    if (filters.companyId) {
      query = query.where("company_id", "=", Number(filters.companyId));
    }
    if (filters.category) {
      query = query.where("category", "=", filters.category);
    }
    if (filters.status) {
      query = query.where("status", "=", filters.status);
    }
    if (filters.search) {
      const likeValue = `%${filters.search}%`;
      query = query.where((builder) =>
        builder.or([
          builder("subject", "like", likeValue),
          builder("from_email", "like", likeValue),
          builder("to_json", "like", likeValue),
        ]),
      );
    }
    if (cursor !== null) {
      query = query.where("id", "<", cursor);
    }

    const rows = await query.execute();
    const hasMore = rows.length > limit;
    const pageRows = hasMore ? rows.slice(0, limit) : rows;
    return {
      items: pageRows.map((row) => toMailLogRecord(row)),
      nextCursor: hasMore ? String(pageRows.at(-1)?.id ?? "") : null,
    };
  }

  public async getLog(mailId: string) {
    const row = await this.db()
      .selectFrom("mail_messages")
      .selectAll()
      .where("id", "=", Number(mailId))
      .executeTakeFirst();
    if (!row) {
      throw new NotFoundException(`Mail log "${mailId}" was not found.`);
    }

    const attempts = await this.db()
      .selectFrom("mail_delivery_attempts")
      .selectAll()
      .where("mail_message_id", "=", Number(mailId))
      .orderBy("attempt_no", "desc")
      .execute();

    return {
      ...toMailLogRecord(row),
      attempts: attempts.map((attempt) => toMailAttemptRecord(attempt)),
    };
  }

  public async retryLog(mailId: string) {
    const row = await this.getRequiredMailRow(mailId);
    if (row.queue_job_id) {
      await this.queueService.retry(String(row.queue_job_id));
    } else {
      const job = await this.queueService.enqueue(
        {
          queueName: "mail",
          jobName: queueJobNameForCategory(normalizeCategory(row.category)),
          companyId: row.company_id === null ? null : String(row.company_id),
          payload: { mailMessageId: mailId },
          priority: 10,
          maxAttempts: 3,
        },
        null,
      );
      await this.db()
        .updateTable("mail_messages")
        .set({
          queue_job_id: Number(job.id),
          updated_at: new Date(),
        })
        .where("id", "=", Number(mailId))
        .executeTakeFirst();
    }

    await this.db()
      .updateTable("mail_messages")
      .set({
        status: "queued",
        last_error: null,
        sent_at: null,
        updated_at: new Date(),
      })
      .where("id", "=", Number(mailId))
      .executeTakeFirst();

    return this.getLog(mailId);
  }

  public async cancelLog(mailId: string) {
    const row = await this.getRequiredMailRow(mailId);
    if (row.queue_job_id) {
      try {
        await this.queueService.cancel(String(row.queue_job_id));
      } catch {
        // Queue job may already be terminal; still persist the mail cancellation.
      }
    }

    await this.db()
      .updateTable("mail_messages")
      .set({
        status: "cancelled",
        updated_at: new Date(),
      })
      .where("id", "=", Number(mailId))
      .executeTakeFirst();

    return this.getLog(mailId);
  }

  public async processQueuedMessage(
    context: QueueJobExecutionContext,
    payload: Record<string, unknown>,
  ) {
    const mailMessageId = textValue(payload.mailMessageId);
    if (!mailMessageId) {
      throw new Error("Queue payload mailMessageId is required.");
    }

    const row = await this.getRequiredMailRow(mailMessageId);
    if (normalizeMailStatus(row.status) === "cancelled") {
      return { skipped: true, reason: "cancelled" };
    }

    await this.db()
      .updateTable("mail_messages")
      .set({
        status: "processing",
        updated_at: new Date(),
      })
      .where("id", "=", Number(mailMessageId))
      .executeTakeFirst();
    await context.setProgress(18);

    const nextAttemptNo = await this.nextAttemptNumber(mailMessageId);
    const attemptInsert = await this.db()
      .insertInto("mail_delivery_attempts")
      .values({
        mail_message_id: Number(mailMessageId),
        queue_job_id: row.queue_job_id,
        attempt_no: nextAttemptNo,
        status: "processing",
        provider_response_json: JSON.stringify({}),
        error_message: null,
        started_at: new Date(),
        finished_at: null,
        created_at: new Date(),
      })
      .executeTakeFirstOrThrow();
    const attemptId = String(attemptInsert.insertId ?? "");

    try {
      const sendResult = await this.transport.send({
        from: formatMailerAddress(String(row.from_email ?? ""), textValue(row.from_name)),
        to: toMailerAddressList(parseMailAddresses(row.to_json)),
        cc: toMailerAddressList(parseMailAddresses(row.cc_json)),
        bcc: toMailerAddressList(parseMailAddresses(row.bcc_json)),
        replyTo: typeof row.reply_to === "string" ? row.reply_to : undefined,
        subject: String(row.subject ?? ""),
        html: String(row.html_body ?? ""),
        text: String(row.text_body ?? ""),
        attachments: toMailerAttachments(parseAttachments(row.attachments_json)),
      });

      await context.setProgress(80);
      await this.db()
        .updateTable("mail_delivery_attempts")
        .set({
          status: "sent",
          provider_response_json: JSON.stringify(sendResult.response),
          finished_at: new Date(),
        })
        .where("id", "=", Number(attemptId))
        .executeTakeFirst();

      await this.db()
        .updateTable("mail_messages")
        .set({
          status: "sent",
          provider_kind: sendResult.providerKind,
          provider_message_id: sendResult.providerMessageId,
          last_error: null,
          sent_at: new Date(),
          updated_at: new Date(),
        })
        .where("id", "=", Number(mailMessageId))
        .executeTakeFirst();

      await context.setProgress(100);
      return {
        mailMessageId,
        attemptNo: nextAttemptNo,
        providerKind: sendResult.providerKind,
        providerMessageId: sendResult.providerMessageId,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Mail delivery failed.";
      await this.db()
        .updateTable("mail_delivery_attempts")
        .set({
          status: "failed",
          error_message: message,
          finished_at: new Date(),
        })
        .where("id", "=", Number(attemptId))
        .executeTakeFirst();

      await this.db()
        .updateTable("mail_messages")
        .set({
          status: "failed",
          last_error: message,
          updated_at: new Date(),
        })
        .where("id", "=", Number(mailMessageId))
        .executeTakeFirst();
      throw error;
    }
  }

  private async nextAttemptNumber(mailMessageId: string) {
    const row = await this.db()
      .selectFrom("mail_delivery_attempts")
      .select((builder) => builder.fn.max("attempt_no").as("attempt_no"))
      .where("mail_message_id", "=", Number(mailMessageId))
      .executeTakeFirst();
    return Number(row?.attempt_no ?? 0) + 1;
  }

  private async getRequiredMailRow(mailId: string) {
    const row = await this.db()
      .selectFrom("mail_messages")
      .selectAll()
      .where("id", "=", Number(mailId))
      .executeTakeFirst();
    if (!row) {
      throw new NotFoundException(`Mail log "${mailId}" was not found.`);
    }
    return row;
  }

  private async getCompanyMailSettings(companyId: string): Promise<CompanyMailSettingsRecord> {
    const row = await this.db()
      .selectFrom("company_settings")
      .select("values_json")
      .where("company_id", "=", Number(companyId))
      .where("setting_key", "=", "mail")
      .executeTakeFirst();

    const values = parseJsonObject(row?.values_json);
    return {
      fromEmail: textValue(values.fromEmail) ?? "",
      fromName: textValue(values.fromName) ?? "",
      replyTo: textValue(values.replyTo) ?? "",
      operationalRecipients: textValue(values.operationalRecipients) ?? "",
    };
  }

  private async getCompanySummary(companyId: string) {
    const row = await this.db()
      .selectFrom("companies")
      .select(["id", "tenant_id", "name"])
      .where("id", "=", Number(companyId))
      .executeTakeFirst();
    if (!row) {
      throw new NotFoundException(`Company "${companyId}" was not found.`);
    }
    return {
      id: String(row.id),
      tenantId: String(row.tenant_id),
      name: String(row.name ?? "Your company"),
    };
  }

  private db(): Kysely<DynamicDatabase> {
    return this.connection.db as unknown as Kysely<DynamicDatabase>;
  }
}

function toMailLogRecord(row: Record<string, unknown>): MailLogRecord {
  return {
    id: String(row.id),
    tenantId: row.tenant_id === null ? null : String(row.tenant_id),
    companyId: row.company_id === null ? null : String(row.company_id),
    queueJobId: row.queue_job_id === null ? null : String(row.queue_job_id),
    templateKey: normalizeTemplateKey(row.template_key),
    category: normalizeCategory(row.category),
    subject: String(row.subject ?? ""),
    previewText: textValue(row.preview_text),
    htmlBody: String(row.html_body ?? ""),
    textBody: String(row.text_body ?? ""),
    status: normalizeMailStatus(row.status),
    fromEmail: String(row.from_email ?? ""),
    fromName: textValue(row.from_name),
    replyTo: textValue(row.reply_to),
    to: parseMailAddresses(row.to_json),
    cc: parseMailAddresses(row.cc_json),
    bcc: parseMailAddresses(row.bcc_json),
    attachments: parseAttachments(row.attachments_json),
    providerKind: String(row.provider_kind ?? "smtp"),
    providerMessageId: textValue(row.provider_message_id),
    requestedByUserId: textValue(row.requested_by_user_id),
    sourceModule: textValue(row.source_module),
    sourceRecordId: textValue(row.source_record_id),
    lastError: textValue(row.last_error),
    sentAt: toNullableIsoString(row.sent_at),
    createdAt: toIsoString(row.created_at),
    updatedAt: toIsoString(row.updated_at),
  };
}

function toMailAttemptRecord(row: Record<string, unknown>): MailDeliveryAttemptRecord {
  return {
    id: String(row.id),
    mailMessageId: String(row.mail_message_id),
    queueJobId: row.queue_job_id === null ? null : String(row.queue_job_id),
    attemptNo: Number(row.attempt_no ?? 0),
    status: normalizeMailStatus(row.status),
    providerResponse: parseJsonObject(row.provider_response_json),
    errorMessage: textValue(row.error_message),
    startedAt: toIsoString(row.started_at),
    finishedAt: toNullableIsoString(row.finished_at),
    createdAt: toIsoString(row.created_at),
  };
}

function normalizeMailAddressList(
  addresses: readonly { readonly email: string; readonly name?: string | null }[],
) {
  return addresses.map((address) => {
    validateEmail(address.email);
    return {
      email: address.email.trim(),
      name: address.name?.trim() || null,
    };
  });
}

function normalizeAttachments(attachments: readonly MailAttachmentRecord[]) {
  return attachments.map((attachment) => ({
    filename: attachment.filename,
    contentBase64: attachment.contentBase64 ?? null,
    contentType: attachment.contentType ?? null,
    path: attachment.path ?? null,
  }));
}

function parseMailAddresses(value: unknown) {
  const parsed = parseJsonArray(value);
  return parsed
    .map((item) => {
      if (!item || typeof item !== "object") {
        return null;
      }
      const record = item as Record<string, unknown>;
      const email = textValue(record.email);
      if (!email) {
        return null;
      }
      return {
        email,
        name: textValue(record.name),
      };
    })
    .filter((item): item is { email: string; name: string | null } => Boolean(item));
}

function parseAttachments(value: unknown): readonly MailAttachmentRecord[] {
  const parsed = parseJsonArray(value);
  const attachments: MailAttachmentRecord[] = [];
  for (const item of parsed) {
    if (!item || typeof item !== "object") {
      continue;
    }
    const record = item as Record<string, unknown>;
    const filename = textValue(record.filename);
    if (!filename) {
      continue;
    }
    attachments.push({
      filename,
      contentBase64: textValue(record.contentBase64) ?? undefined,
      contentType: textValue(record.contentType),
      path: textValue(record.path),
    });
  }
  return attachments;
}

function parseJsonArray(value: unknown) {
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as unknown;
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return Array.isArray(value) ? value : [];
}

function parseJsonObject(value: unknown) {
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as unknown;
      return parsed && typeof parsed === "object" && !Array.isArray(parsed)
        ? (parsed as Record<string, unknown>)
        : {};
    } catch {
      return {};
    }
  }
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function queueJobNameForCategory(category: MailCategory) {
  switch (category) {
    case "otp":
      return "send-otp";
    case "auth-recovery":
      return "send-auth-recovery";
    case "invoice":
      return "send-invoice";
    case "report":
      return "send-report";
    case "sync-alert":
      return "send-sync-alert";
    case "queue-failure-alert":
      return "send-queue-alert";
    case "worker-notification":
      return "send-worker";
    case "test":
      return "send-test";
    default:
      return "send-generic";
  }
}

function normalizeCategory(value: unknown): MailCategory {
  return mailCategories.includes(value as MailCategory)
    ? (value as MailCategory)
    : "generic-transactional";
}

function normalizeTemplateKey(value: unknown): MailTemplateKey {
  return mailTemplateKeys.includes(value as MailTemplateKey)
    ? (value as MailTemplateKey)
    : "generic-transactional";
}

function normalizeMailStatus(value: unknown): MailStatus {
  return mailStatuses.includes(value as MailStatus) ? (value as MailStatus) : "queued";
}

function normalizeLimit(limit: number | undefined) {
  if (!Number.isFinite(limit)) {
    return 20;
  }
  return Math.min(50, Math.max(1, Math.trunc(limit ?? 20)));
}

function normalizeCursor(value: string | null | undefined) {
  if (!value) {
    return null;
  }
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function validateEmail(email: string) {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    throw new BadRequestException(`"${email}" is not a valid email address.`);
  }
}

function parseEmails(value: string) {
  return value
    .split(/[,\n;]/g)
    .map((item) => item.trim())
    .filter(Boolean);
}

function textValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function firstFilled(...values: readonly (string | null | undefined)[]) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return null;
}

function toIsoString(value: unknown) {
  if (value instanceof Date) {
    return value.toISOString();
  }
  return new Date(String(value ?? "")).toISOString();
}

function toNullableIsoString(value: unknown) {
  if (!value) {
    return null;
  }
  return toIsoString(value);
}

function toMailerAddressList(
  addresses: readonly { readonly email: string; readonly name?: string | null }[],
): string[] {
  return addresses.map((address) => formatMailerAddress(address.email, address.name ?? null));
}

function toMailerAttachments(attachments: readonly MailAttachmentRecord[]): Mail.Attachment[] {
  return attachments.map((attachment) => ({
    filename: attachment.filename,
    path: attachment.path ?? undefined,
    content: attachment.contentBase64 ? Buffer.from(attachment.contentBase64, "base64") : undefined,
    contentType: attachment.contentType ?? undefined,
  }));
}

function formatMailerAddress(address: string, name: string | null) {
  return name ? `${name} <${address}>` : address;
}

function emptyCompanyMailSettings(): CompanyMailSettingsRecord {
  return {
    fromEmail: "",
    fromName: "",
    replyTo: "",
    operationalRecipients: "",
  };
}
