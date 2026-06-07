import { Module } from '../../../core/decorators/module.js'
import { TenantContextService } from '../../../core/tenant/tenant-context.service.js'
import { MasterQueueService } from '../../../infrastructure/queue/master-queue.service.js'
import { TenantRepository } from '../../../core/tenant/infrastructure/tenant.repository.js'
import { TenantDomainRepository } from '../../../core/tenant-domain/infrastructure/tenant-domain.repository.js'
import { AuthRepository } from '../../auth/infrastructure/auth.repository.js'
import { AuditorClientService } from './application/auditor-client.service.js'
import { AuditorClientRepository } from './infrastructure/persistence/auditor-client.repository.js'
import { AuditorClientsV1Controller } from './interface/http/auditor-clients-v1.controller.js'

@Module({
  controllers: [AuditorClientsV1Controller],
  providers: [
    AuthRepository,
    TenantRepository,
    TenantDomainRepository,
    TenantContextService,
    MasterQueueService,
    AuditorClientRepository,
    AuditorClientService,
  ],
})
export class AuditorClientModule {}
