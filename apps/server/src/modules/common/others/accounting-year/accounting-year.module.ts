import { Module } from '../../../../core/decorators/module.js'
import { TenantContextService } from '../../../../core/tenant/tenant-context.service.js'
import { MasterQueueService } from '../../../../infrastructure/queue/master-queue.service.js'
import { AuthRepository } from '../../../auth/infrastructure/auth.repository.js'
import { MasterRecordEventBus } from '../../../foundation/master-record/application/services/master-record-event-bus.js'
import { TenantRepository } from '../../../../core/tenant/infrastructure/tenant.repository.js'
import { TenantDomainRepository } from '../../../../core/tenant-domain/infrastructure/tenant-domain.repository.js'
import { AccountingYearCommonService } from './application/accounting-year.service.js'
import { AccountingYearCommonRepository } from './infrastructure/persistence/accounting-year.repository.js'
import { AccountingYearCommonV1Controller } from './interface/http/accounting-year-v1.controller.js'

@Module({
  controllers: [AccountingYearCommonV1Controller],
  providers: [
    AuthRepository,
    TenantRepository,
    TenantDomainRepository,
    TenantContextService,
    MasterQueueService,
    MasterRecordEventBus,
    AccountingYearCommonRepository,
    AccountingYearCommonService,
  ],
})
export class AccountingYearCommonModule {}
