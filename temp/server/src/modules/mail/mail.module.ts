import { Module } from "@nestjs/common";
import { QueueModule } from "../queue/queue.module";
import { MailQueueBootstrap } from "./application/mail-queue.bootstrap";
import { MailService } from "./application/mail.service";
import { MailController } from "./interface/http/mail.controller";

@Module({
  imports: [QueueModule],
  controllers: [MailController],
  providers: [MailService, MailQueueBootstrap],
  exports: [MailService],
})
export class MailModule {}
