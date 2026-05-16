import { Module } from '../../../../core/decorators/module.js'
import { TenantContextService } from '../../../../core/tenant/tenant-context.service.js'
import { MasterQueueService } from '../../../../infrastructure/queue/master-queue.service.js'
import { AuthRepository } from '../../../auth/infrastructure/auth.repository.js'
import { MasterRecordEventBus } from '../../../foundation/master-record/application/services/master-record-event-bus.js'
import { TenantRepository } from '../../../../core/tenant/infrastructure/tenant.repository.js'
import { TenantDomainRepository } from '../../../../core/tenant-domain/infrastructure/tenant-domain.repository.js'
import { StockRejectionTypesCommonService } from './application/stock-rejection-types.service.js'
import { StockRejectionTypesCommonRepository } from './infrastructure/persistence/stock-rejection-types.repository.js'
import { StockRejectionTypesCommonV1Controller } from './interface/http/stock-rejection-types-v1.controller.js'

@Module({
  controllers: [StockRejectionTypesCommonV1Controller],
  providers: [
    AuthRepository,
    TenantRepository,
    TenantDomainRepository,
    TenantContextService,
    MasterQueueService,
    MasterRecordEventBus,
    StockRejectionTypesCommonRepository,
    StockRejectionTypesCommonService,
  ],
})
export class StockRejectionTypesCommonModule {}
