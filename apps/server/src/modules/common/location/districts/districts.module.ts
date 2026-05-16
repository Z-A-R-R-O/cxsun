import { Module } from '../../../../core/decorators/module.js'
import { TenantContextService } from '../../../../core/tenant/tenant-context.service.js'
import { MasterQueueService } from '../../../../infrastructure/queue/master-queue.service.js'
import { AuthRepository } from '../../../auth/infrastructure/auth.repository.js'
import { MasterRecordEventBus } from '../../../foundation/master-record/application/services/master-record-event-bus.js'
import { TenantRepository } from '../../../../core/tenant/infrastructure/tenant.repository.js'
import { TenantDomainRepository } from '../../../../core/tenant-domain/infrastructure/tenant-domain.repository.js'
import { DistrictsCommonService } from './application/districts.service.js'
import { DistrictsCommonRepository } from './infrastructure/persistence/districts.repository.js'
import { DistrictsCommonV1Controller } from './interface/http/districts-v1.controller.js'

@Module({
  controllers: [DistrictsCommonV1Controller],
  providers: [
    AuthRepository,
    TenantRepository,
    TenantDomainRepository,
    TenantContextService,
    MasterQueueService,
    MasterRecordEventBus,
    DistrictsCommonRepository,
    DistrictsCommonService,
  ],
})
export class DistrictsCommonModule {}
