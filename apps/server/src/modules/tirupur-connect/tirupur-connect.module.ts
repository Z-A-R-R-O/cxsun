import { Module } from '../../core/decorators/module.js'
import { TenantContextService } from '../../core/tenant/tenant-context.service.js'
import { TenantRepository } from '../../core/tenant/infrastructure/tenant.repository.js'
import { TenantDomainRepository } from '../../core/tenant-domain/infrastructure/tenant-domain.repository.js'
import { AuthRepository } from '../auth/infrastructure/auth.repository.js'
import { TirupurConnectService } from './application/tirupur-connect.service.js'
import { TirupurConnectRepository } from './infrastructure/tirupur-connect.repository.js'
import { TirupurConnectController } from './interface/http/tirupur-connect.controller.js'

@Module({
  controllers: [TirupurConnectController],
  providers: [
    AuthRepository,
    TenantRepository,
    TenantDomainRepository,
    TenantContextService,
    TirupurConnectRepository,
    TirupurConnectService,
  ],
})
export class TirupurConnectModule {}
