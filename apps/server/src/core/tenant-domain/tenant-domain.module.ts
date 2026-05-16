import { Module } from '../decorators/module.js'
import { TenantDomainService } from './application/tenant-domain.service.js'
import { TenantDomainRepository } from './infrastructure/tenant-domain.repository.js'
import { TenantDomainsV1Controller } from './interface/http/tenant-domains-v1.controller.js'

@Module({
  controllers: [TenantDomainsV1Controller],
  providers: [TenantDomainService, TenantDomainRepository],
})
export class TenantDomainModule {}
