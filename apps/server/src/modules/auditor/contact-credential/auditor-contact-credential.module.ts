import { Module } from '../../../core/decorators/module.js'
import { MasterQueueService } from '../../../infrastructure/queue/master-queue.service.js'
import { TenantRepository } from '../../../core/tenant/infrastructure/tenant.repository.js'
import { TenantDomainRepository } from '../../../core/tenant-domain/infrastructure/tenant-domain.repository.js'
import { AuthRepository } from '../../auth/infrastructure/auth.repository.js'
import { AuditorContactCredentialService } from './application/auditor-contact-credential.service.js'
import { AuditorContactCredentialRepository } from './infrastructure/persistence/auditor-contact-credential.repository.js'
import { AuditorContactCredentialsV1Controller } from './interface/http/auditor-contact-credentials-v1.controller.js'

@Module({
  controllers: [AuditorContactCredentialsV1Controller],
  providers: [AuthRepository, TenantRepository, TenantDomainRepository, MasterQueueService, AuditorContactCredentialRepository, AuditorContactCredentialService],
})
export class AuditorContactCredentialModule {}
