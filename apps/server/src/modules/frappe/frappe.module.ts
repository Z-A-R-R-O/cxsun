import { Module } from '../../core/decorators/module.js'
import { TenantRepository } from '../../core/tenant/infrastructure/tenant.repository.js'
import { TenantDomainRepository } from '../../core/tenant-domain/infrastructure/tenant-domain.repository.js'
import { MasterQueueService } from '../../infrastructure/queue/master-queue.service.js'
import { AuthRepository } from '../auth/infrastructure/auth.repository.js'
import { FrappeController } from './frappe.controller.js'
import { FrappeRepository } from './frappe.repository.js'
import { FrappeService } from './frappe.service.js'

@Module({
  controllers: [FrappeController],
  providers: [
    AuthRepository,
    TenantRepository,
    TenantDomainRepository,
    MasterQueueService,
    FrappeRepository,
    FrappeService,
  ],
})
export class FrappeModule {}
