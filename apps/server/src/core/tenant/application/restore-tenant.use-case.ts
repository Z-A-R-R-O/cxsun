import { Inject } from '../../decorators/inject.js'
import { Injectable } from '../../decorators/injectable.js'
import { tenantRestored } from '../domain/tenant.events.js'
import { TenantRepository } from '../infrastructure/tenant.repository.js'
import { TenantEventBus } from './tenant-event-bus.js'

@Injectable()
export class RestoreTenantUseCase {
  constructor(
    @Inject(TenantRepository) private readonly tenants: TenantRepository,
    @Inject(TenantEventBus) private readonly events: TenantEventBus,
  ) {}

  async execute(id: number) {
    const tenant = await this.tenants.findAnyById(id)

    if (!tenant) {
      return { ok: false, error: 'Tenant was not found.' }
    }

    if (!tenant.deleted_at) {
      return { ok: true }
    }

    const restored = await this.tenants.restore(id)

    if (!restored) {
      return { ok: false, error: 'Tenant was not found.' }
    }

    this.events.publish(tenantRestored(tenant.id, tenant.code))

    return { ok: true }
  }
}
