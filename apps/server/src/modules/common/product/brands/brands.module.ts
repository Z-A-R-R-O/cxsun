import { Module } from '../../../../core/decorators/module.js'
import { TenantContextService } from '../../../../core/tenant/tenant-context.service.js'
import { MasterQueueService } from '../../../../infrastructure/queue/master-queue.service.js'
import { AuthRepository } from '../../../auth/infrastructure/auth.repository.js'
import { MasterRecordEventBus } from '../../../foundation/master-record/application/services/master-record-event-bus.js'
import { TenantRepository } from '../../../../core/tenant/infrastructure/tenant.repository.js'
import { TenantDomainRepository } from '../../../../core/tenant-domain/infrastructure/tenant-domain.repository.js'
import { BrandsCommonService } from './application/brands.service.js'
import { BrandsCommonRepository } from './infrastructure/persistence/brands.repository.js'
import { BrandsCommonV1Controller } from './interface/http/brands-v1.controller.js'

@Module({
  controllers: [BrandsCommonV1Controller],
  providers: [
    AuthRepository,
    TenantRepository,
    TenantDomainRepository,
    TenantContextService,
    MasterQueueService,
    MasterRecordEventBus,
    BrandsCommonRepository,
    BrandsCommonService,
  ],
})
export class BrandsCommonModule {}
