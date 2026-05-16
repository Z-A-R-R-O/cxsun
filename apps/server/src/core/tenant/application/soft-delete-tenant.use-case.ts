import { Inject } from '../../decorators/inject.js'
import { Injectable } from '../../decorators/injectable.js'
import { tenantDeleted } from '../domain/tenant.events.js'
import { TenantRepository } from '../infrastructure/tenant.repository.js'
import { TenantEventBus } from './tenant-event-bus.js'

@Injectable()
export class SoftDeleteTenantUseCase {
  constructor(
    @Inject(TenantRepository) private readonly tenants: TenantRepository,
    @Inject(TenantEventBus) private readonly events: TenantEventBus,
  ) {}

  async execute(id: number) {
    const tenant = await this.tenants.findById(id)

    if (!tenant) {
      return { ok: false, error: 'Tenant was not found.' }
    }

    const deleted = await this.tenants.softDelete(id)

    if (!deleted) {
      return { ok: false, error: 'Tenant was not found.' }
    }

    this.events.publish(tenantDeleted(tenant.id, tenant.code))

    return { ok: true }
  }
}
