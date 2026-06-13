import 'reflect-metadata'
import { Module } from '../../core/decorators/module.js'
import { DomainResolutionEngine } from '../../core/tenant-domain/application/domain-resolution.engine.js'
import { TenantRepository } from '../../core/tenant/infrastructure/tenant.repository.js'
import { TenantDomainRepository } from '../../core/tenant-domain/infrastructure/tenant-domain.repository.js'
import { MasterQueueService } from '../../infrastructure/queue/master-queue.service.js'
import { AuthRepository } from '../auth/infrastructure/auth.repository.js'
import { SiteController } from './site.controller.js'
import { SiteService } from './site.service.js'
import { SiteSliderService } from './slider/application/site-slider.service.js'
import { SiteSliderEventBus } from './slider/application/site-slider-event-bus.js'
import { SiteSliderRepository } from './slider/infrastructure/site-slider.repository.js'
import { SiteSliderController } from './slider/interface/site-slider.controller.js'

@Module({
  controllers: [SiteController, SiteSliderController],
  providers: [
    AuthRepository,
    TenantRepository,
    TenantDomainRepository,
    MasterQueueService,
    DomainResolutionEngine,
    SiteSliderEventBus,
    SiteSliderRepository,
    SiteSliderService,
    SiteService,
  ],
})
export class SiteModule {}
