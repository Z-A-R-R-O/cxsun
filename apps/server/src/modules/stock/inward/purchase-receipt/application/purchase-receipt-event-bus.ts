import { Inject } from '../../../../../core/decorators/inject.js'
import { Injectable } from '../../../../../core/decorators/injectable.js'
import { MasterQueueService } from '../../../../../infrastructure/queue/master-queue.service.js'
import type { PurchaseReceiptDomainEvent } from '../domain/events/purchase-receipt.events.js'

@Injectable()
export class PurchaseReceiptEventBus {
  constructor(@Inject(MasterQueueService) private readonly queue: MasterQueueService) {}

  async publish(event: PurchaseReceiptDomainEvent) {
    await this.queue.enqueue({
      type: event.name,
      payload: { ...event },
    })
  }
}

