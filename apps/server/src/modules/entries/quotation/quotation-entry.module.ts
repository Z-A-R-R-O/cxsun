import { Module } from '../../../core/decorators/module.js'
import { MasterQueueService } from '../../../infrastructure/queue/master-queue.service.js'
import { AuthRepository } from '../../auth/infrastructure/auth.repository.js'
import { TenantRepository } from '../../../core/tenant/infrastructure/tenant.repository.js'
import { TenantDomainRepository } from '../../../core/tenant-domain/infrastructure/tenant-domain.repository.js'
import { QuotationEntryEventBus } from './application/quotation-entry-event-bus.js'
import { QuotationEntryService } from './application/quotation-entry.service.js'
import { QuotationEntryRepository } from './infrastructure/persistence/quotation-entry.repository.js'
import { QuotationEntryV1Controller } from './interface/http/quotation-entry-v1.controller.js'
import { DocumentNumberRepository } from '../../settings/document-settings/infrastructure/document-number.repository.js'
import { MailRepository } from '../../mail/mail.repository.js'
import { EntryDocumentMailService } from '../shared/entry-document-mail.service.js'
import { EntryDocumentPdfDownloadService } from '../shared/entry-document-pdf-download.service.js'
import { PrintHtmlPdfService } from '../shared/print-html-pdf.service.js'
import { SalesEntryRepository } from '../sales/infrastructure/persistence/sales-entry.repository.js'

@Module({
  controllers: [QuotationEntryV1Controller],
  providers: [
    AuthRepository,
    TenantRepository,
    TenantDomainRepository,
    MasterQueueService,
    MailRepository,
    EntryDocumentMailService,
    EntryDocumentPdfDownloadService,
    PrintHtmlPdfService,
    QuotationEntryEventBus,
    DocumentNumberRepository,
    SalesEntryRepository,
    QuotationEntryRepository,
    QuotationEntryService,
  ],
})
export class QuotationEntryModule {}

