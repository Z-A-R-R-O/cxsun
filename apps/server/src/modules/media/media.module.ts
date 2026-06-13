import { Module } from '../../core/decorators/module.js'
import { TenantRepository } from '../../core/tenant/infrastructure/tenant.repository.js'
import { TenantDomainRepository } from '../../core/tenant-domain/infrastructure/tenant-domain.repository.js'
import { MasterQueueService } from '../../infrastructure/queue/master-queue.service.js'
import { AuthRepository } from '../auth/infrastructure/auth.repository.js'
import { MediaController, PublicStorageController } from './media.controller.js'
import { MediaRepository } from './media.repository.js'
import { MediaService } from './media.service.js'

@Module({
  controllers: [MediaController, PublicStorageController],
  providers: [
    AuthRepository,
    TenantRepository,
    TenantDomainRepository,
    MasterQueueService,
    MediaRepository,
    MediaService,
  ],
})
export class MediaModule {}
