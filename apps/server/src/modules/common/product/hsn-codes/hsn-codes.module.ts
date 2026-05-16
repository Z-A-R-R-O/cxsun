import { Module } from '../../../../core/decorators/module.js'
import { TenantContextService } from '../../../../core/tenant/tenant-context.service.js'
import { MasterQueueService } from '../../../../infrastructure/queue/master-queue.service.js'
import { AuthRepository } from '../../../auth/infrastructure/auth.repository.js'
import { MasterRecordEventBus } from '../../../foundation/master-record/application/services/master-record-event-bus.js'
import { TenantRepository } from '../../../../core/tenant/infrastructure/tenant.repository.js'
import { TenantDomainRepository } from '../../../../core/tenant-domain/infrastructure/tenant-domain.repository.js'
import { HsnCodesCommonService } from './application/hsn-codes.service.js'
import { HsnCodesCommonRepository } from './infrastructure/persistence/hsn-codes.repository.js'
import { HsnCodesCommonV1Controller } from './interface/http/hsn-codes-v1.controller.js'

@Module({
  controllers: [HsnCodesCommonV1Controller],
  providers: [
    AuthRepository,
    TenantRepository,
    TenantDomainRepository,
    TenantContextService,
    MasterQueueService,
    MasterRecordEventBus,
    HsnCodesCommonRepository,
    HsnCodesCommonService,
  ],
})
export class HsnCodesCommonModule {}
