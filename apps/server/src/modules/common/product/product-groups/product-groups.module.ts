import { Module } from '../../../../core/decorators/module.js'
import { TenantContextService } from '../../../../core/tenant/tenant-context.service.js'
import { MasterQueueService } from '../../../../infrastructure/queue/master-queue.service.js'
import { AuthRepository } from '../../../auth/infrastructure/auth.repository.js'
import { MasterRecordEventBus } from '../../../foundation/master-record/application/services/master-record-event-bus.js'
import { TenantRepository } from '../../../../core/tenant/infrastructure/tenant.repository.js'
import { TenantDomainRepository } from '../../../../core/tenant-domain/infrastructure/tenant-domain.repository.js'
import { ProductGroupsCommonService } from './application/product-groups.service.js'
import { ProductGroupsCommonRepository } from './infrastructure/persistence/product-groups.repository.js'
import { ProductGroupsCommonV1Controller } from './interface/http/product-groups-v1.controller.js'

@Module({
  controllers: [ProductGroupsCommonV1Controller],
  providers: [
    AuthRepository,
    TenantRepository,
    TenantDomainRepository,
    TenantContextService,
    MasterQueueService,
    MasterRecordEventBus,
    ProductGroupsCommonRepository,
    ProductGroupsCommonService,
  ],
})
export class ProductGroupsCommonModule {}
