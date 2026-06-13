import { Module } from '../../../core/decorators/module.js'
import { MasterQueueService } from '../../../infrastructure/queue/master-queue.service.js'
import { AuthRepository } from '../../auth/infrastructure/auth.repository.js'
import { TenantRepository } from '../../../core/tenant/infrastructure/tenant.repository.js'
import { TenantDomainRepository } from '../../../core/tenant-domain/infrastructure/tenant-domain.repository.js'
import { PurchaseEntryEventBus } from './application/purchase-entry-event-bus.js'
import { PurchaseEntryService } from './application/purchase-entry.service.js'
import { PurchaseEntryRepository } from './infrastructure/persistence/purchase-entry.repository.js'
import { PurchaseEntryV1Controller } from './interface/http/purchase-entry-v1.controller.js'
import { DocumentNumberRepository } from '../../settings/document-settings/infrastructure/document-number.repository.js'
import { MailRepository } from '../../mail/mail.repository.js'
import { EntryDocumentMailService } from '../shared/entry-document-mail.service.js'
import { PrintHtmlPdfService } from '../shared/print-html-pdf.service.js'
import { AccountsEngineRepository } from '../../accounts/accounts-engine.repository.js'
import { AccountsEntryPostingService } from '../../accounts/accounts-entry-posting.service.js'

@Module({
  controllers: [PurchaseEntryV1Controller],
  providers: [
    AuthRepository,
    TenantRepository,
    TenantDomainRepository,
    MasterQueueService,
    MailRepository,
    EntryDocumentMailService,
    PrintHtmlPdfService,
    PurchaseEntryEventBus,
    DocumentNumberRepository,
    AccountsEngineRepository,
    AccountsEntryPostingService,
    PurchaseEntryRepository,
    PurchaseEntryService,
  ],
})
export class PurchaseEntryModule {}

