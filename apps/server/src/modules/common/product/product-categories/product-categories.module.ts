import { Module } from '../../../../core/decorators/module.js'
import { MasterQueueService } from '../../../../infrastructure/queue/master-queue.service.js'
import { AuthRepository } from '../../../auth/infrastructure/auth.repository.js'
import { MasterRecordEventBus } from '../../../foundation/master-record/application/services/master-record-event-bus.js'
import { TenantRepository } from '../../../../core/tenant/infrastructure/tenant.repository.js'
import { TenantDomainRepository } from '../../../../core/tenant-domain/infrastructure/tenant-domain.repository.js'
import { ProductCategoriesCommonService } from './service.js'
import { ProductCategoriesCommonRepository } from './repository.js'
import { ProductCategoriesCommonV1Controller } from './controller.js'

@Module({
  controllers: [ProductCategoriesCommonV1Controller],
  providers: [
    AuthRepository,
    TenantRepository,
    TenantDomainRepository,
    MasterQueueService,
    MasterRecordEventBus,
    ProductCategoriesCommonRepository,
    ProductCategoriesCommonService,
  ],
})
export class ProductCategoriesCommonModule {}
