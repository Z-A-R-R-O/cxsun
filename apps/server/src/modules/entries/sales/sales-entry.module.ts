import { Module } from '../../../core/decorators/module.js'
import { TenantContextService } from '../../../core/tenant/tenant-context.service.js'
import { MasterQueueService } from '../../../infrastructure/queue/master-queue.service.js'
import { AuthRepository } from '../../auth/infrastructure/auth.repository.js'
import { TenantRepository } from '../../../core/tenant/infrastructure/tenant.repository.js'
import { TenantDomainRepository } from '../../../core/tenant-domain/infrastructure/tenant-domain.repository.js'
import { SalesEntryEventBus } from './application/sales-entry-event-bus.js'
import { SalesEntryService } from './application/sales-entry.service.js'
import { SalesEntryRepository } from './infrastructure/persistence/sales-entry.repository.js'
import { SalesEntryV1Controller } from './interface/http/sales-entry-v1.controller.js'

@Module({
  controllers: [SalesEntryV1Controller],
  providers: [
    AuthRepository,
    TenantRepository,
    TenantDomainRepository,
    TenantContextService,
    MasterQueueService,
    SalesEntryEventBus,
    SalesEntryRepository,
    SalesEntryService,
  ],
})
export class SalesEntryModule {}
