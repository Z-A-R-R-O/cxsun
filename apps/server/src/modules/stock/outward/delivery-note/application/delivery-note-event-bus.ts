import { Inject } from '../../../../../core/decorators/inject.js'
import { Injectable } from '../../../../../core/decorators/injectable.js'
import { MasterQueueService } from '../../../../../infrastructure/queue/master-queue.service.js'
import type { DeliveryNoteDomainEvent } from '../domain/events/delivery-note.events.js'

@Injectable()
export class DeliveryNoteEventBus {
  constructor(@Inject(MasterQueueService) private readonly queue: MasterQueueService) {}

  async publish(event: DeliveryNoteDomainEvent) {
    await this.queue.enqueue({
      type: event.name,
      payload: { ...event },
    })
  }
}

