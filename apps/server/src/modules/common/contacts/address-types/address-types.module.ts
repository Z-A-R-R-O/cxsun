import { Module } from '../../../../core/decorators/module.js'
import { MasterQueueService } from '../../../../infrastructure/queue/master-queue.service.js'
import { AuthRepository } from '../../../auth/infrastructure/auth.repository.js'
import { MasterRecordEventBus } from '../../../foundation/master-record/application/services/master-record-event-bus.js'
import { TenantRepository } from '../../../../core/tenant/infrastructure/tenant.repository.js'
import { TenantDomainRepository } from '../../../../core/tenant-domain/infrastructure/tenant-domain.repository.js'
import { AddressTypesCommonService } from './service.js'
import { AddressTypesCommonRepository } from './repository.js'
import { AddressTypesCommonV1Controller } from './controller.js'

@Module({
  controllers: [AddressTypesCommonV1Controller],
  providers: [
    AuthRepository,
    TenantRepository,
    TenantDomainRepository,
    MasterQueueService,
    MasterRecordEventBus,
    AddressTypesCommonRepository,
    AddressTypesCommonService,
  ],
})
export class AddressTypesCommonModule {}
