import { Module } from '../../../../core/decorators/module.js'
import { MasterQueueService } from '../../../../infrastructure/queue/master-queue.service.js'
import { AuthRepository } from '../../../auth/infrastructure/auth.repository.js'
import { MasterRecordEventBus } from '../../../foundation/master-record/application/services/master-record-event-bus.js'
import { TenantRepository } from '../../../../core/tenant/infrastructure/tenant.repository.js'
import { TenantDomainRepository } from '../../../../core/tenant-domain/infrastructure/tenant-domain.repository.js'
import { OrderTypesCommonService } from './service.js'
import { OrderTypesCommonRepository } from './repository.js'
import { OrderTypesCommonV1Controller } from './controller.js'

@Module({
  controllers: [OrderTypesCommonV1Controller],
  providers: [
    AuthRepository,
    TenantRepository,
    TenantDomainRepository,
    MasterQueueService,
    MasterRecordEventBus,
    OrderTypesCommonRepository,
    OrderTypesCommonService,
  ],
})
export class OrderTypesCommonModule {}
