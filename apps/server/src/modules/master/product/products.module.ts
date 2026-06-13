import { Module } from '../../../core/decorators/module.js'
import { MasterQueueService } from '../../../infrastructure/queue/master-queue.service.js'
import { AuthRepository } from '../../auth/infrastructure/auth.repository.js'
import { MasterRecordEventBus } from '../../foundation/master-record/application/services/master-record-event-bus.js'
import { TenantRepository } from '../../../core/tenant/infrastructure/tenant.repository.js'
import { TenantDomainRepository } from '../../../core/tenant-domain/infrastructure/tenant-domain.repository.js'
import { ProductMasterService } from './application/product-master.service.js'
import { ProductMasterRepository } from './infrastructure/persistence/product-master.repository.js'
import { ProductsV1Controller } from './interface/http/products-v1.controller.js'

@Module({
  controllers: [ProductsV1Controller],
  providers: [
    AuthRepository,
    TenantRepository,
    TenantDomainRepository,
    MasterQueueService,
    MasterRecordEventBus,
    ProductMasterRepository,
    ProductMasterService,
  ],
})
export class ProductsModule {}
