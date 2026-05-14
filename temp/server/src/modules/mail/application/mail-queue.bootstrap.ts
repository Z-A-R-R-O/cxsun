import { Injectable, type OnModuleInit } from "@nestjs/common";
import type { QueueJobHandlerDefinition } from "../../queue/domain/queue-job-handler";
import { QueueService } from "../../queue/application/queue.service";
import { MailService } from "./mail.service";

@Injectable()
export class MailQueueBootstrap implements OnModuleInit {
  public constructor(
    private readonly queueService: QueueService,
    private readonly mailService: MailService,
  ) {}

  public onModuleInit() {
    this.queueService.registerHandlers(mailQueueDefinitions(this.mailService));
  }
}

function mailQueueDefinitions(mailService: MailService): readonly QueueJobHandlerDefinition[] {
  return [
    defineMailJob("send-otp", "Send OTP", "Send a one-time password email.", mailService),
    defineMailJob(
      "send-auth-recovery",
      "Send recovery email",
      "Send a password reset or account recovery email.",
      mailService,
    ),
    defineMailJob(
      "send-invoice",
      "Send invoice",
      "Send an invoice email with optional attachment metadata.",
      mailService,
    ),
    defineMailJob("send-report", "Send report", "Send a report delivery email.", mailService),
    defineMailJob("send-sync-alert", "Send sync alert", "Send a sync alert notification.", mailService),
    defineMailJob(
      "send-queue-alert",
      "Send queue alert",
      "Send a queue failure alert notification.",
      mailService,
    ),
    defineMailJob("send-worker", "Send worker notice", "Send a worker notification.", mailService),
    defineMailJob("send-test", "Send test email", "Send an operator test email.", mailService),
    defineMailJob(
      "send-generic",
      "Send transactional email",
      "Send a generic queued transactional email.",
      mailService,
    ),
  ];
}

function defineMailJob(
  jobName: string,
  label: string,
  description: string,
  mailService: MailService,
): QueueJobHandlerDefinition {
  return {
    queueName: "mail",
    jobName,
    label,
    description,
    samplePayload: {
      mailMessageId: "1",
    },
    run: (context, payload) => mailService.processQueuedMessage(context, payload),
  };
}
