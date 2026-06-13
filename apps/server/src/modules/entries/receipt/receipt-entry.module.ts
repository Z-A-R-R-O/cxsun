import { Module } from '../../../core/decorators/module.js'
import { TenantContextService } from '../../../core/tenant/tenant-context.service.js'
import { MasterQueueService } from '../../../infrastructure/queue/master-queue.service.js'
import { AuthRepository } from '../../auth/infrastructure/auth.repository.js'
import { TenantRepository } from '../../../core/tenant/infrastructure/tenant.repository.js'
import { TenantDomainRepository } from '../../../core/tenant-domain/infrastructure/tenant-domain.repository.js'
import { DocumentNumberRepository } from '../../settings/document-settings/infrastructure/document-number.repository.js'
import { MailRepository } from '../../mail/mail.repository.js'
import { AccountsEngineRepository } from '../../accounts/accounts-engine.repository.js'
import { AccountsEntryPostingService } from '../../accounts/accounts-entry-posting.service.js'
import { EntryDocumentMailService } from '../shared/entry-document-mail.service.js'
import { PrintHtmlPdfService } from '../shared/print-html-pdf.service.js'
import { ReceiptEntryController } from './receipt-entry.controller.js'
import { ReceiptEntryRepository } from './receipt-entry.repository.js'
import { ReceiptEntryService } from './receipt-entry.service.js'

@Module({
  controllers: [ReceiptEntryController],
  providers: [
    AuthRepository,
    TenantRepository,
    TenantDomainRepository,
    TenantContextService,
    MasterQueueService,
    MailRepository,
    EntryDocumentMailService,
    PrintHtmlPdfService,
    DocumentNumberRepository,
    AccountsEngineRepository,
    AccountsEntryPostingService,
    ReceiptEntryRepository,
    ReceiptEntryService,
  ],
})
export class ReceiptEntryModule {}
