import { Module } from '../../../../core/decorators/module.js'
import { MasterQueueService } from '../../../../infrastructure/queue/master-queue.service.js'
import { AuthRepository } from '../../../auth/infrastructure/auth.repository.js'
import { MasterRecordEventBus } from '../../../foundation/master-record/application/services/master-record-event-bus.js'
import { TenantRepository } from '../../../../core/tenant/infrastructure/tenant.repository.js'
import { TenantDomainRepository } from '../../../../core/tenant-domain/infrastructure/tenant-domain.repository.js'
import { ContactGroupsCommonService } from './service.js'
import { ContactGroupsCommonRepository } from './repository.js'
import { ContactGroupsCommonV1Controller } from './controller.js'

@Module({
  controllers: [ContactGroupsCommonV1Controller],
  providers: [
    AuthRepository,
    TenantRepository,
    TenantDomainRepository,
    MasterQueueService,
    MasterRecordEventBus,
    ContactGroupsCommonRepository,
    ContactGroupsCommonService,
  ],
})
export class ContactGroupsCommonModule {}
