import { Module } from '../../../../core/decorators/module.js'
import { TenantContextService } from '../../../../core/tenant/tenant-context.service.js'
import { MasterQueueService } from '../../../../infrastructure/queue/master-queue.service.js'
import { AuthRepository } from '../../../auth/infrastructure/auth.repository.js'
import { MasterRecordEventBus } from '../../../foundation/master-record/application/services/master-record-event-bus.js'
import { TenantRepository } from '../../../../core/tenant/infrastructure/tenant.repository.js'
import { TenantDomainRepository } from '../../../../core/tenant-domain/infrastructure/tenant-domain.repository.js'
import { AddressTypesCommonService } from './application/address-types.service.js'
import { AddressTypesCommonRepository } from './infrastructure/persistence/address-types.repository.js'
import { AddressTypesCommonV1Controller } from './interface/http/address-types-v1.controller.js'

@Module({
  controllers: [AddressTypesCommonV1Controller],
  providers: [
    AuthRepository,
    TenantRepository,
    TenantDomainRepository,
    TenantContextService,
    MasterQueueService,
    MasterRecordEventBus,
    AddressTypesCommonRepository,
    AddressTypesCommonService,
  ],
})
export class AddressTypesCommonModule {}
