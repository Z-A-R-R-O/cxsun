import { Module } from '../../../core/decorators/module.js'
import { MasterQueueService } from '../../../infrastructure/queue/master-queue.service.js'
import { AuthRepository } from '../../auth/infrastructure/auth.repository.js'
import { TenantRepository } from '../../../core/tenant/infrastructure/tenant.repository.js'
import { TenantDomainRepository } from '../../../core/tenant-domain/infrastructure/tenant-domain.repository.js'
import { DocumentNumberRepository } from '../../settings/document-settings/infrastructure/document-number.repository.js'
import { MailRepository } from '../../mail/mail.repository.js'
import { AccountsEngineRepository } from '../../accounts/accounts-engine.repository.js'
import { AccountsEntryPostingService } from '../../accounts/accounts-entry-posting.service.js'
import { EntryDocumentMailService } from '../shared/entry-document-mail.service.js'
import { EntryDocumentPdfDownloadService } from '../shared/entry-document-pdf-download.service.js'
import { PrintHtmlPdfService } from '../shared/print-html-pdf.service.js'
import { EntryPostingControlService } from '../shared/entry-posting-control.service.js'
import { PaymentEntryController } from './payment-entry.controller.js'
import { PaymentEntryRepository } from './payment-entry.repository.js'
import { PaymentEntryService } from './payment-entry.service.js'

@Module({
  controllers: [PaymentEntryController],
  providers: [
    AuthRepository,
    TenantRepository,
    TenantDomainRepository,
    MasterQueueService,
    MailRepository,
    EntryDocumentMailService,
    EntryDocumentPdfDownloadService,
    PrintHtmlPdfService,
    DocumentNumberRepository,
    AccountsEngineRepository,
    AccountsEntryPostingService,
    EntryPostingControlService,
    PaymentEntryRepository,
    PaymentEntryService,
  ],
})
export class PaymentEntryModule {}
