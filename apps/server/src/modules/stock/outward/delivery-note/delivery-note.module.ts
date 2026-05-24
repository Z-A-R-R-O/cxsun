import { Module } from '../../../../core/decorators/module.js'
import { TenantContextService } from '../../../../core/tenant/tenant-context.service.js'
import { MasterQueueService } from '../../../../infrastructure/queue/master-queue.service.js'
import { AuthRepository } from '../../../auth/infrastructure/auth.repository.js'
import { TenantRepository } from '../../../../core/tenant/infrastructure/tenant.repository.js'
import { TenantDomainRepository } from '../../../../core/tenant-domain/infrastructure/tenant-domain.repository.js'
import { DeliveryNoteEventBus } from './application/delivery-note-event-bus.js'
import { DeliveryNoteService } from './application/delivery-note.service.js'
import { DeliveryNoteRepository } from './infrastructure/persistence/delivery-note.repository.js'
import { DeliveryNoteV1Controller } from './interface/http/delivery-note-v1.controller.js'
import { DocumentNumberRepository } from '../../../settings/document-settings/infrastructure/document-number.repository.js'

@Module({
  controllers: [DeliveryNoteV1Controller],
  providers: [
    AuthRepository,
    TenantRepository,
    TenantDomainRepository,
    TenantContextService,
    MasterQueueService,
    DeliveryNoteEventBus,
    DocumentNumberRepository,
    DeliveryNoteRepository,
    DeliveryNoteService,
  ],
})
export class DeliveryNoteModule {}

