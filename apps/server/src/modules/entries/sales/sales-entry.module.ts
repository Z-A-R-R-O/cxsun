import { Module } from '../../../core/decorators/module.js'
import { MasterQueueService } from '../../../infrastructure/queue/master-queue.service.js'
import { AuthRepository } from '../../auth/infrastructure/auth.repository.js'
import { TenantRepository } from '../../../core/tenant/infrastructure/tenant.repository.js'
import { TenantDomainRepository } from '../../../core/tenant-domain/infrastructure/tenant-domain.repository.js'
import { SalesEntryEventBus } from './application/sales-entry-event-bus.js'
import { SalesEntryService } from './application/sales-entry.service.js'
import { SalesEntryRepository } from './infrastructure/persistence/sales-entry.repository.js'
import { SalesEntryV1Controller } from './interface/http/sales-entry-v1.controller.js'
import { DocumentNumberRepository } from '../../settings/document-settings/infrastructure/document-number.repository.js'
import { MailRepository } from '../../mail/mail.repository.js'
import { EntryDocumentMailService } from '../shared/entry-document-mail.service.js'
import { PrintHtmlPdfService } from '../shared/print-html-pdf.service.js'
import { QuotationEntryRepository } from '../quotation/infrastructure/persistence/quotation-entry.repository.js'
import { AccountsEngineRepository } from '../../accounts/accounts-engine.repository.js'
import { AccountsEntryPostingService } from '../../accounts/accounts-entry-posting.service.js'

@Module({
  controllers: [SalesEntryV1Controller],
  providers: [
    AuthRepository,
    TenantRepository,
    TenantDomainRepository,
    MasterQueueService,
    MailRepository,
    EntryDocumentMailService,
    PrintHtmlPdfService,
    SalesEntryEventBus,
    DocumentNumberRepository,
    AccountsEngineRepository,
    AccountsEntryPostingService,
    QuotationEntryRepository,
    SalesEntryRepository,
    SalesEntryService,
  ],
})
export class SalesEntryModule {}
