import { Module } from '../../core/decorators/module.js'
import { TenantContextService } from '../../core/tenant/tenant-context.service.js'
import { TenantRepository } from '../../core/tenant/infrastructure/tenant.repository.js'
import { TenantDomainRepository } from '../../core/tenant-domain/infrastructure/tenant-domain.repository.js'
import { MasterQueueService } from '../../infrastructure/queue/master-queue.service.js'
import { AuthRepository } from '../auth/infrastructure/auth.repository.js'
import { TaskManagerController } from './task-manager.controller.js'
import { TaskManagerRepository } from './task-manager.repository.js'
import { TaskManagerService } from './task-manager.service.js'

@Module({
  controllers: [TaskManagerController],
  providers: [
    AuthRepository,
    TenantRepository,
    TenantDomainRepository,
    TenantContextService,
    MasterQueueService,
    TaskManagerRepository,
    TaskManagerService,
  ],
})
export class TaskManagerModule {}
