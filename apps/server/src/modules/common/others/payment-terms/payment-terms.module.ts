import { Module } from '../../../../core/decorators/module.js'
import { TenantContextService } from '../../../../core/tenant/tenant-context.service.js'
import { MasterQueueService } from '../../../../infrastructure/queue/master-queue.service.js'
import { AuthRepository } from '../../../auth/infrastructure/auth.repository.js'
import { MasterRecordEventBus } from '../../../foundation/master-record/application/services/master-record-event-bus.js'
import { TenantRepository } from '../../../../core/tenant/infrastructure/tenant.repository.js'
import { TenantDomainRepository } from '../../../../core/tenant-domain/infrastructure/tenant-domain.repository.js'
import { PaymentTermsCommonService } from './application/payment-terms.service.js'
import { PaymentTermsCommonRepository } from './infrastructure/persistence/payment-terms.repository.js'
import { PaymentTermsCommonV1Controller } from './interface/http/payment-terms-v1.controller.js'

@Module({
  controllers: [PaymentTermsCommonV1Controller],
  providers: [
    AuthRepository,
    TenantRepository,
    TenantDomainRepository,
    TenantContextService,
    MasterQueueService,
    MasterRecordEventBus,
    PaymentTermsCommonRepository,
    PaymentTermsCommonService,
  ],
})
export class PaymentTermsCommonModule {}
