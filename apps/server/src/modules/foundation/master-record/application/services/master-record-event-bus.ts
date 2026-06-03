import { Injectable } from '../../../../../core/decorators/injectable.js'
import type { MasterQueueService } from '../../../../../infrastructure/queue/master-queue.service.js'
import type { MasterRecordDomainEvent } from '../../domain/events/master-record.events.js'

@Injectable()
export class MasterRecordEventBus {
  private readonly events: MasterRecordDomainEvent[] = []
  private queue?: MasterQueueService

  async publish(event: MasterRecordDomainEvent) {
    this.events.unshift(event)

    if (this.events.length > 100) {
      this.events.length = 100
    }

    const queue = await this.getQueue()
    await queue.enqueue({
      type: event.name,
      payload: { ...event },
    })

    console.info(`[master-data:event] ${event.name} ${event.moduleKey}:${event.uuid}`)
  }

  recent() {
    return [...this.events]
  }

  private async getQueue() {
    if (!this.queue) {
      const { MasterQueueService } = await import(
        '../../../../../infrastructure/queue/master-queue.service.js'
      )
      this.queue = new MasterQueueService()
    }

    return this.queue
  }
}
