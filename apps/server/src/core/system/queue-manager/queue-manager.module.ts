import 'reflect-metadata'
import { Module } from '../../decorators/module.js'
import { MasterQueueService } from '../../../infrastructure/queue/master-queue.service.js'
import { QueueManagerController } from './queue-manager.controller.js'
import { QueueManagerService } from './queue-manager.service.js'

@Module({
  controllers: [QueueManagerController],
  providers: [QueueManagerService, MasterQueueService],
})
export class QueueManagerModule {}
