import { Module } from '../../core/decorators/module.js'
import { TenantContextService } from '../../core/tenant/tenant-context.service.js'
import { TenantRepository } from '../../core/tenant/infrastructure/tenant.repository.js'
import { TenantDomainRepository } from '../../core/tenant-domain/infrastructure/tenant-domain.repository.js'
import { MasterQueueService } from '../../infrastructure/queue/master-queue.service.js'
import { AuthRepository } from '../auth/infrastructure/auth.repository.js'
import { SalesEntryRepository } from '../entries/sales/infrastructure/persistence/sales-entry.repository.js'
import { PurchaseEntryRepository } from '../entries/purchase/infrastructure/persistence/purchase-entry.repository.js'
import { DocumentNumberRepository } from '../settings/document-settings/infrastructure/document-number.repository.js'
import { ContactMasterRepository } from '../master/contact/infrastructure/persistence/contact-master.repository.js'
import { ProductMasterRepository } from '../master/product/infrastructure/persistence/product-master.repository.js'
import { TallyController } from './tally.controller.js'
import { TallyRepository } from './tally.repository.js'
import { TallyService } from './tally.service.js'

@Module({
  controllers: [TallyController],
  providers: [
    AuthRepository,
    TenantRepository,
    TenantDomainRepository,
    TenantContextService,
    MasterQueueService,
    DocumentNumberRepository,
    ContactMasterRepository,
    ProductMasterRepository,
    SalesEntryRepository,
    PurchaseEntryRepository,
    TallyRepository,
    TallyService,
  ],
})
export class TallyModule {}
