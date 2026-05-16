import { Injectable } from '../../decorators/injectable.js'
import type { TenantDomainEvent } from '../domain/tenant.events.js'

@Injectable()
export class TenantEventBus {
  private readonly events: TenantDomainEvent[] = []

  publish(event: TenantDomainEvent) {
    this.events.unshift(event)

    if (this.events.length > 50) {
      this.events.length = 50
    }

    console.info(`[tenant:event] ${event.name} ${event.tenantCode}`)
  }

  recent() {
    return [...this.events]
  }
}
