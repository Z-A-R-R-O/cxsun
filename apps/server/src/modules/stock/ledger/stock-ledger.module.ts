import { Module } from '../../../core/decorators/module.js'
import { MasterQueueService } from '../../../infrastructure/queue/master-queue.service.js'
import { AuthRepository } from '../../auth/infrastructure/auth.repository.js'
import { TenantRepository } from '../../../core/tenant/infrastructure/tenant.repository.js'
import { TenantDomainRepository } from '../../../core/tenant-domain/infrastructure/tenant-domain.repository.js'
import { StockLedgerEventBus } from './application/stock-ledger-event-bus.js'
import { StockLedgerService } from './application/stock-ledger.service.js'
import { StockLedgerRepository } from './infrastructure/persistence/stock-ledger.repository.js'
import { StockLedgerV1Controller } from './interface/http/stock-ledger-v1.controller.js'

@Module({
  controllers: [StockLedgerV1Controller],
  providers: [
    AuthRepository,
    TenantRepository,
    TenantDomainRepository,
    MasterQueueService,
    StockLedgerEventBus,
    StockLedgerRepository,
    StockLedgerService,
  ],
})
export class StockLedgerModule {}
