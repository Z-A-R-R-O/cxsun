import { Module } from '../../../../core/decorators/module.js'
import { TenantContextService } from '../../../../core/tenant/tenant-context.service.js'
import { MasterQueueService } from '../../../../infrastructure/queue/master-queue.service.js'
import { AuthRepository } from '../../../auth/infrastructure/auth.repository.js'
import { MasterRecordEventBus } from '../../../foundation/master-record/application/services/master-record-event-bus.js'
import { TenantRepository } from '../../../../core/tenant/infrastructure/tenant.repository.js'
import { TenantDomainRepository } from '../../../../core/tenant-domain/infrastructure/tenant-domain.repository.js'
import { ProductCategoriesCommonService } from './application/product-categories.service.js'
import { ProductCategoriesCommonRepository } from './infrastructure/persistence/product-categories.repository.js'
import { ProductCategoriesCommonV1Controller } from './interface/http/product-categories-v1.controller.js'

@Module({
  controllers: [ProductCategoriesCommonV1Controller],
  providers: [
    AuthRepository,
    TenantRepository,
    TenantDomainRepository,
    TenantContextService,
    MasterQueueService,
    MasterRecordEventBus,
    ProductCategoriesCommonRepository,
    ProductCategoriesCommonService,
  ],
})
export class ProductCategoriesCommonModule {}
