import { Module } from '../../../../core/decorators/module.js'
import { TenantContextService } from '../../../../core/tenant/tenant-context.service.js'
import { MasterQueueService } from '../../../../infrastructure/queue/master-queue.service.js'
import { AuthRepository } from '../../../auth/infrastructure/auth.repository.js'
import { MasterRecordEventBus } from '../../../foundation/master-record/application/services/master-record-event-bus.js'
import { TenantRepository } from '../../../../core/tenant/infrastructure/tenant.repository.js'
import { TenantDomainRepository } from '../../../../core/tenant-domain/infrastructure/tenant-domain.repository.js'
import { OrderTypesCommonService } from './application/order-types.service.js'
import { OrderTypesCommonRepository } from './infrastructure/persistence/order-types.repository.js'
import { OrderTypesCommonV1Controller } from './interface/http/order-types-v1.controller.js'

@Module({
  controllers: [OrderTypesCommonV1Controller],
  providers: [
    AuthRepository,
    TenantRepository,
    TenantDomainRepository,
    TenantContextService,
    MasterQueueService,
    MasterRecordEventBus,
    OrderTypesCommonRepository,
    OrderTypesCommonService,
  ],
})
export class OrderTypesCommonModule {}
