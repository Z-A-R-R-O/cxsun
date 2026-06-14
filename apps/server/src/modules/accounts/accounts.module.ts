import { Module } from '../../core/decorators/module.js'
import { AuthRepository } from '../auth/infrastructure/auth.repository.js'
import { TenantRepository } from '../../core/tenant/infrastructure/tenant.repository.js'
import { TenantDomainRepository } from '../../core/tenant-domain/infrastructure/tenant-domain.repository.js'
import { AccountsController } from './accounts.controller.js'
import { AccountsEntryPostingService } from './accounts-entry-posting.service.js'
import { AccountsEngineRepository } from './accounts-engine.repository.js'
import { AccountsRepository } from './accounts.repository.js'
import { AccountsService } from './accounts.service.js'
import { DocumentNumberRepository } from '../settings/document-settings/infrastructure/document-number.repository.js'
import { EntryPostingControlService } from '../entries/shared/entry-posting-control.service.js'

@Module({
  controllers: [AccountsController],
  providers: [
    AuthRepository,
    TenantRepository,
    TenantDomainRepository,
    DocumentNumberRepository,
    AccountsEngineRepository,
    AccountsEntryPostingService,
    AccountsRepository,
    AccountsService,
    EntryPostingControlService,
  ],
})
export class AccountsModule {}
