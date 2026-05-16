import { Inject } from '../../../../core/decorators/inject.js'
import { Injectable } from '../../../../core/decorators/injectable.js'
import { MasterQueueService } from '../../../../infrastructure/queue/master-queue.service.js'
import type { SalesEntryDomainEvent } from '../domain/events/sales-entry.events.js'

@Injectable()
export class SalesEntryEventBus {
  constructor(@Inject(MasterQueueService) private readonly queue: MasterQueueService) {}

  async publish(event: SalesEntryDomainEvent) {
    await this.queue.enqueue({
      type: event.name,
      payload: { ...event },
    })
  }
}
