import { Module } from '../../../../core/decorators/module.js'
import { TenantContextService } from '../../../../core/tenant/tenant-context.service.js'
import { MasterQueueService } from '../../../../infrastructure/queue/master-queue.service.js'
import { AuthRepository } from '../../../auth/infrastructure/auth.repository.js'
import { TenantRepository } from '../../../../core/tenant/infrastructure/tenant.repository.js'
import { TenantDomainRepository } from '../../../../core/tenant-domain/infrastructure/tenant-domain.repository.js'
import { PurchaseReceiptEventBus } from './application/purchase-receipt-event-bus.js'
import { PurchaseReceiptService } from './application/purchase-receipt.service.js'
import { PurchaseReceiptRepository } from './infrastructure/persistence/purchase-receipt.repository.js'
import { PurchaseReceiptV1Controller } from './interface/http/purchase-receipt-v1.controller.js'
import { DocumentNumberRepository } from '../../../settings/document-settings/infrastructure/document-number.repository.js'

@Module({
  controllers: [PurchaseReceiptV1Controller],
  providers: [
    AuthRepository,
    TenantRepository,
    TenantDomainRepository,
    TenantContextService,
    MasterQueueService,
    PurchaseReceiptEventBus,
    DocumentNumberRepository,
    PurchaseReceiptRepository,
    PurchaseReceiptService,
  ],
})
export class PurchaseReceiptModule {}

