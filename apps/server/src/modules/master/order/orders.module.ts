import { Module } from '../../../core/decorators/module.js'
import { MasterQueueService } from '../../../infrastructure/queue/master-queue.service.js'
import { AuthRepository } from '../../auth/infrastructure/auth.repository.js'
import { MasterRecordEventBus } from '../../foundation/master-record/application/services/master-record-event-bus.js'
import { TenantRepository } from '../../../core/tenant/infrastructure/tenant.repository.js'
import { TenantDomainRepository } from '../../../core/tenant-domain/infrastructure/tenant-domain.repository.js'
import { OrderMasterService } from './application/order-master.service.js'
import { OrderMasterRepository } from './infrastructure/persistence/order-master.repository.js'
import { OrdersV1Controller } from './interface/http/orders-v1.controller.js'

@Module({
  controllers: [OrdersV1Controller],
  providers: [
    AuthRepository,
    TenantRepository,
    TenantDomainRepository,
    MasterQueueService,
    MasterRecordEventBus,
    OrderMasterRepository,
    OrderMasterService,
  ],
})
export class OrdersModule {}
