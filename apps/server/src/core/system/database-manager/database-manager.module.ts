import 'reflect-metadata'
import { Module } from '../../decorators/module.js'
import { MasterQueueService } from '../../../infrastructure/queue/master-queue.service.js'
import { DatabaseManagerController } from './database-manager.controller.js'
import { DatabaseManagerService } from './database-manager.service.js'

@Module({
  controllers: [DatabaseManagerController],
  providers: [DatabaseManagerService, MasterQueueService],
})
export class DatabaseManagerModule {}
