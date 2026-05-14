import 'reflect-metadata'
import { Module } from '../../core/decorators/module.js'
import { MasterQueueService } from '../../infrastructure/queue/master-queue.service.js'
import { TenantDatabaseProvisioner } from '../../infrastructure/tenant-database/tenant-database.provisioner.js'
import { ListTenantsUseCase } from './application/list-tenants.use-case.js'
import { RestoreTenantUseCase } from './application/restore-tenant.use-case.js'
import { ResolveTenantContextUseCase } from './application/resolve-tenant-context.use-case.js'
import { SoftDeleteTenantUseCase } from './application/soft-delete-tenant.use-case.js'
import { TenantEventBus } from './application/tenant-event-bus.js'
import { UpsertTenantUseCase } from './application/upsert-tenant.use-case.js'
import { TenantRepository } from './infrastructure/tenant.repository.js'
import { TenantsV1Controller } from './interface/http/tenants-v1.controller.js'
import { TenantService } from './tenant.service.js'

@Module({
  controllers: [TenantsV1Controller],
  providers: [
    TenantService,
    MasterQueueService,
    ListTenantsUseCase,
    RestoreTenantUseCase,
    ResolveTenantContextUseCase,
    SoftDeleteTenantUseCase,
    UpsertTenantUseCase,
    TenantRepository,
    TenantEventBus,
    TenantDatabaseProvisioner,
  ],
})
export class TenantModule {}
