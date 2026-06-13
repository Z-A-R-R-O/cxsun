import { Module } from '../../../core/decorators/module.js'
import { MasterQueueService } from '../../../infrastructure/queue/master-queue.service.js'
import { TenantRepository } from '../../../core/tenant/infrastructure/tenant.repository.js'
import { TenantDomainRepository } from '../../../core/tenant-domain/infrastructure/tenant-domain.repository.js'
import { AuthRepository } from '../../auth/infrastructure/auth.repository.js'
import { AuditorGstFilingService } from './application/auditor-gst-filing.service.js'
import { AuditorGstFilingRepository } from './infrastructure/persistence/auditor-gst-filing.repository.js'
import { AuditorGstFilingsV1Controller } from './interface/http/auditor-gst-filings-v1.controller.js'

@Module({
  controllers: [AuditorGstFilingsV1Controller],
  providers: [
    AuthRepository,
    TenantRepository,
    TenantDomainRepository,
    MasterQueueService,
    AuditorGstFilingRepository,
    AuditorGstFilingService,
  ],
})
export class AuditorGstFilingModule {}
