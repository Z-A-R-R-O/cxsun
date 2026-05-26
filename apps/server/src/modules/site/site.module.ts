import 'reflect-metadata'
import { Module } from '../../core/decorators/module.js'
import { DomainResolutionEngine } from '../../core/tenant-domain/application/domain-resolution.engine.js'
import { TenantDomainRepository } from '../../core/tenant-domain/infrastructure/tenant-domain.repository.js'
import { SiteController } from './site.controller.js'
import { SiteService } from './site.service.js'

@Module({
  controllers: [SiteController],
  providers: [DomainResolutionEngine, TenantDomainRepository, SiteService],
})
export class SiteModule {}
