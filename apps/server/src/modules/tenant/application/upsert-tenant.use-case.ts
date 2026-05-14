import { Inject } from '../../../core/decorators/inject.js'
import { Injectable } from '../../../core/decorators/injectable.js'
import { MasterQueueService } from '../../../infrastructure/queue/master-queue.service.js'
import { TenantAggregate, TenantValidationError } from '../domain/tenant.aggregate.js'
import { tenantCreated, tenantUpdated } from '../domain/tenant.events.js'
import type { Tenant, TenantUpsertInput } from '../domain/tenant.types.js'
import { TenantRepository } from '../infrastructure/tenant.repository.js'
import { TenantEventBus } from './tenant-event-bus.js'

type TenantUpsertResult =
  | { ok: true; tenant: Tenant }
  | { ok: false; error: string }

@Injectable()
export class UpsertTenantUseCase {
  constructor(
    @Inject(TenantRepository) private readonly tenants: TenantRepository,
    @Inject(TenantEventBus) private readonly events: TenantEventBus,
    @Inject(MasterQueueService) private readonly queue: MasterQueueService,
  ) {}

  async execute(input: TenantUpsertInput): Promise<TenantUpsertResult> {
    try {
      const payload = TenantAggregate.normalize(input, await this.tenants.nextCode())

      if (input.id) {
        const existing = await this.tenants.findById(input.id)

        if (!existing) {
          return { ok: false, error: 'Tenant was not found.' }
        }

        if (await this.tenants.hasCode(payload.code, input.id)) {
          return { ok: false, error: 'Tenant code is already used.' }
        }

        if (await this.tenants.hasSlug(payload.slug, input.id)) {
          return { ok: false, error: 'Tenant slug is already used.' }
        }

        const tenant = await this.tenants.update(input.id, payload)
        this.events.publish(tenantUpdated(tenant.id, tenant.code))

        return { ok: true, tenant }
      }

      if (await this.tenants.hasCode(payload.code)) {
        return { ok: false, error: 'Tenant code is already used.' }
      }

      if (await this.tenants.hasSlug(payload.slug)) {
        return { ok: false, error: 'Tenant slug is already used.' }
      }

      const tenant = await this.tenants.insert(payload)
      this.events.publish(tenantCreated(tenant.id, tenant.code))
      await this.queue.enqueue({
        type: 'tenant.database.provision',
        payload: {
          tenantId: tenant.id,
          tenantSlug: tenant.slug,
          database: tenant.db_name,
        },
      })

      return { ok: true, tenant }
    } catch (error) {
      if (error instanceof TenantValidationError) {
        return { ok: false, error: error.message }
      }

      throw error
    }
  }
}
