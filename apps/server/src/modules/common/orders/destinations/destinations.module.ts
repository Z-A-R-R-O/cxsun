import { Module } from '../../../../core/decorators/module.js'
import { TenantContextService } from '../../../../core/tenant/tenant-context.service.js'
import { MasterQueueService } from '../../../../infrastructure/queue/master-queue.service.js'
import { AuthRepository } from '../../../auth/infrastructure/auth.repository.js'
import { MasterRecordEventBus } from '../../../foundation/master-record/application/services/master-record-event-bus.js'
import { TenantRepository } from '../../../../core/tenant/infrastructure/tenant.repository.js'
import { TenantDomainRepository } from '../../../../core/tenant-domain/infrastructure/tenant-domain.repository.js'
import { DestinationsCommonService } from './application/destinations.service.js'
import { DestinationsCommonRepository } from './infrastructure/persistence/destinations.repository.js'
import { DestinationsCommonV1Controller } from './interface/http/destinations-v1.controller.js'

@Module({
  controllers: [DestinationsCommonV1Controller],
  providers: [
    AuthRepository,
    TenantRepository,
    TenantDomainRepository,
    TenantContextService,
    MasterQueueService,
    MasterRecordEventBus,
    DestinationsCommonRepository,
    DestinationsCommonService,
  ],
})
export class DestinationsCommonModule {}
