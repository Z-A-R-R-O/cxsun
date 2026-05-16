import { Module } from '../../../core/decorators/module.js'
import { TenantContextService } from '../../../core/tenant/tenant-context.service.js'
import { MasterQueueService } from '../../../infrastructure/queue/master-queue.service.js'
import { AuthRepository } from '../../auth/infrastructure/auth.repository.js'
import { MasterRecordEventBus } from '../../foundation/master-record/application/services/master-record-event-bus.js'
import { TenantRepository } from '../../../core/tenant/infrastructure/tenant.repository.js'
import { TenantDomainRepository } from '../../../core/tenant-domain/infrastructure/tenant-domain.repository.js'
import { ContactMasterService } from './application/contact-master.service.js'
import { ContactMasterRepository } from './infrastructure/persistence/contact-master.repository.js'
import { ContactsV1Controller } from './interface/http/contacts-v1.controller.js'

@Module({
  controllers: [ContactsV1Controller],
  providers: [
    AuthRepository,
    TenantRepository,
    TenantDomainRepository,
    TenantContextService,
    MasterQueueService,
    MasterRecordEventBus,
    ContactMasterRepository,
    ContactMasterService,
  ],
})
export class ContactsModule {}
