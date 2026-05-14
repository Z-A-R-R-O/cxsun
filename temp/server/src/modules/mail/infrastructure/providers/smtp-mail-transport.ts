import { createTransport } from "nodemailer";
import type Mail from "nodemailer/lib/mailer";

export interface MailTransportStatusRecord {
  readonly mode: "smtp" | "stream";
  readonly configured: boolean;
  readonly host: string | null;
  readonly port: number | null;
  readonly secure: boolean;
  readonly defaultFromEmail: string | null;
  readonly defaultFromName: string | null;
}

export interface MailTransportSendInput {
  readonly from: string;
  readonly to: string[];
  readonly cc?: string[];
  readonly bcc?: string[];
  readonly replyTo?: string | undefined;
  readonly subject: string;
  readonly html: string;
  readonly text: string;
  readonly attachments?: Mail.Attachment[];
}

export interface MailTransportSendResult {
  readonly providerKind: "smtp" | "stream";
  readonly providerMessageId: string | null;
  readonly response: Record<string, unknown>;
}

export class SmtpMailTransport {
  public status(): MailTransportStatusRecord {
    return {
      mode: this.hasSmtpConfig() ? "smtp" : "stream",
      configured: this.hasSmtpConfig(),
      host: textOrNull(process.env.SMTP_HOST),
      port: numberOrNull(process.env.SMTP_PORT),
      secure: process.env.SMTP_SECURE === "true",
      defaultFromEmail: textOrNull(process.env.SMTP_FROM_EMAIL),
      defaultFromName: textOrNull(process.env.SMTP_FROM_NAME),
    };
  }

  public async verify() {
    if (!this.hasSmtpConfig()) {
      return {
        ok: true,
        mode: "stream" as const,
        message: "SMTP host is not configured. Using local stream transport fallback.",
      };
    }

    const transporter = this.createMailer();
    await transporter.verify();
    return { ok: true, mode: "smtp" as const, message: "SMTP transport verified successfully." };
  }

  public async send(input: MailTransportSendInput): Promise<MailTransportSendResult> {
    const transporter = this.createMailer();
    const info = (await transporter.sendMail({
      from: input.from,
      to: input.to,
      cc: input.cc,
      bcc: input.bcc,
      replyTo: input.replyTo,
      subject: input.subject,
      html: input.html,
      text: input.text,
      attachments: input.attachments,
    })) as unknown as Record<string, unknown>;

    return {
      providerKind: this.hasSmtpConfig() ? "smtp" : "stream",
      providerMessageId: typeof info.messageId === "string" ? info.messageId : null,
      response: {
        accepted: Array.isArray(info.accepted) ? info.accepted : [],
        rejected: Array.isArray(info.rejected) ? info.rejected : [],
        response: typeof info.response === "string" ? info.response : null,
        envelope: info.envelope ?? null,
        messageSize:
          info.message instanceof Buffer
            ? info.message.length
            : typeof info.message === "string"
              ? info.message.length
              : null,
      },
    };
  }

  private createMailer() {
    if (!this.hasSmtpConfig()) {
      return createTransport({
        streamTransport: true,
        buffer: true,
        newline: "unix",
      });
    }

    return createTransport({
      host: process.env.SMTP_HOST,
      port: numberOrNull(process.env.SMTP_PORT) ?? 587,
      secure: process.env.SMTP_SECURE === "true",
      auth:
        process.env.SMTP_USER && process.env.SMTP_PASS
          ? {
              user: process.env.SMTP_USER,
              pass: process.env.SMTP_PASS,
            }
          : undefined,
      pool: true,
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 15_000,
    });
  }

  private hasSmtpConfig() {
    return Boolean(textOrNull(process.env.SMTP_HOST));
  }
}

function textOrNull(value: string | undefined) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function numberOrNull(value: string | undefined) {
  if (!value?.trim()) {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}
