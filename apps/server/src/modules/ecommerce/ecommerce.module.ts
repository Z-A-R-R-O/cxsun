import { Module } from '../../core/decorators/module.js'
import { TenantRepository } from '../../core/tenant/infrastructure/tenant.repository.js'
import { TenantDomainRepository } from '../../core/tenant-domain/infrastructure/tenant-domain.repository.js'
import { AuthRepository } from '../auth/infrastructure/auth.repository.js'
import { EcommerceController } from './ecommerce.controller.js'
import { EcommerceRepository } from './ecommerce.repository.js'
import { EcommerceService } from './ecommerce.service.js'

@Module({
  controllers: [EcommerceController],
  providers: [
    AuthRepository,
    TenantRepository,
    TenantDomainRepository,
    EcommerceRepository,
    EcommerceService,
  ],
})
export class EcommerceModule {}
