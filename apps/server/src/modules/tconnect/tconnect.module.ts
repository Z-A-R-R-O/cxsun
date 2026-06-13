import { Module } from '../../core/decorators/module.js'
import { TenantRepository } from '../../core/tenant/infrastructure/tenant.repository.js'
import { TenantDomainRepository } from '../../core/tenant-domain/infrastructure/tenant-domain.repository.js'
import { AuthRepository } from '../auth/infrastructure/auth.repository.js'
import { TConnectService } from './application/tconnect.service.js'
import { TConnectPublicRepository } from './infrastructure/tconnect-public.repository.js'
import { TConnectRepository } from './infrastructure/tconnect.repository.js'
import { TConnectController } from './interface/http/tconnect.controller.js'

@Module({
  controllers: [TConnectController],
  providers: [
    AuthRepository,
    TenantRepository,
    TenantDomainRepository,
    TConnectPublicRepository,
    TConnectRepository,
    TConnectService,
  ],
})
export class TConnectModule {}
