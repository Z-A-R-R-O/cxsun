import { Injectable } from '../../decorators/injectable.js'
import type { MigrationManagerEvent } from '../domain/migration-manager.events.js'

@Injectable()
export class MigrationManagerEventBus {
  private readonly events: MigrationManagerEvent[] = []

  publish(event: MigrationManagerEvent) {
    this.events.unshift(event)
    this.events.splice(50)
  }

  recent() {
    return [...this.events]
  }
}
