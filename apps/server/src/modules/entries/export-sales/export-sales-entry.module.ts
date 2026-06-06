import { Module } from '../../../core/decorators/module.js'
import { TenantContextService } from '../../../core/tenant/tenant-context.service.js'
import { MasterQueueService } from '../../../infrastructure/queue/master-queue.service.js'
import { AuthRepository } from '../../auth/infrastructure/auth.repository.js'
import { TenantRepository } from '../../../core/tenant/infrastructure/tenant.repository.js'
import { TenantDomainRepository } from '../../../core/tenant-domain/infrastructure/tenant-domain.repository.js'
import { ExportSalesEntryEventBus } from './application/export-sales-entry-event-bus.js'
import { ExportSalesEntryService } from './application/export-sales-entry.service.js'
import { ExportSalesEntryRepository } from './infrastructure/persistence/export-sales-entry.repository.js'
import { ExportSalesEntryV1Controller } from './interface/http/export-sales-entry-v1.controller.js'
import { DocumentNumberRepository } from '../../settings/document-settings/infrastructure/document-number.repository.js'
import { MailRepository } from '../../mail/mail.repository.js'
import { EntryDocumentMailService } from '../shared/entry-document-mail.service.js'
import { PrintHtmlPdfService } from '../shared/print-html-pdf.service.js'

@Module({
  controllers: [ExportSalesEntryV1Controller],
  providers: [
    AuthRepository,
    TenantRepository,
    TenantDomainRepository,
    TenantContextService,
    MasterQueueService,
    MailRepository,
    EntryDocumentMailService,
    PrintHtmlPdfService,
    ExportSalesEntryEventBus,
    DocumentNumberRepository,
    ExportSalesEntryRepository,
    ExportSalesEntryService,
  ],
})
export class ExportSalesEntryModule {}




