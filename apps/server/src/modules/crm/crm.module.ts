import { Module } from '../../core/decorators/module.js'
import { TenantContextService } from '../../core/tenant/tenant-context.service.js'
import { TenantRepository } from '../../core/tenant/infrastructure/tenant.repository.js'
import { TenantDomainRepository } from '../../core/tenant-domain/infrastructure/tenant-domain.repository.js'
import { AuthRepository } from '../auth/infrastructure/auth.repository.js'
import { CrmController } from './crm.controller.js'
import { CrmRepository } from './crm.repository.js'
import { CrmService } from './crm.service.js'

@Module({
  controllers: [CrmController],
  providers: [
    AuthRepository,
    TenantRepository,
    TenantDomainRepository,
    TenantContextService,
    CrmRepository,
    CrmService,
  ],
})
export class CrmModule {}
