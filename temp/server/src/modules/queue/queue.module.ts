import { Module } from "@nestjs/common";
import { QueueService } from "./application/queue.service";
import { QueueController } from "./interface/http/queue.controller";

@Module({
  controllers: [QueueController],
  providers: [QueueService],
  exports: [QueueService],
})
export class QueueModule {}
