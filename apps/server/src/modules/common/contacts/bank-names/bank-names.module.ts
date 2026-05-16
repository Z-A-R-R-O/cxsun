import { Module } from '../../../../core/decorators/module.js'
import { TenantContextService } from '../../../../core/tenant/tenant-context.service.js'
import { MasterQueueService } from '../../../../infrastructure/queue/master-queue.service.js'
import { AuthRepository } from '../../../auth/infrastructure/auth.repository.js'
import { MasterRecordEventBus } from '../../../foundation/master-record/application/services/master-record-event-bus.js'
import { TenantRepository } from '../../../../core/tenant/infrastructure/tenant.repository.js'
import { TenantDomainRepository } from '../../../../core/tenant-domain/infrastructure/tenant-domain.repository.js'
import { BankNamesCommonService } from './application/bank-names.service.js'
import { BankNamesCommonRepository } from './infrastructure/persistence/bank-names.repository.js'
import { BankNamesCommonV1Controller } from './interface/http/bank-names-v1.controller.js'

@Module({
  controllers: [BankNamesCommonV1Controller],
  providers: [
    AuthRepository,
    TenantRepository,
    TenantDomainRepository,
    TenantContextService,
    MasterQueueService,
    MasterRecordEventBus,
    BankNamesCommonRepository,
    BankNamesCommonService,
  ],
})
export class BankNamesCommonModule {}
