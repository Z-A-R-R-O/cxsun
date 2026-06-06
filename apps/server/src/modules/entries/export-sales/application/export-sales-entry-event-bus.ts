import { Inject } from '../../../../core/decorators/inject.js'
import { Injectable } from '../../../../core/decorators/injectable.js'
import { MasterQueueService } from '../../../../infrastructure/queue/master-queue.service.js'
import type { ExportSalesEntryDomainEvent } from '../domain/events/export-sales-entry.events.js'

@Injectable()
export class ExportSalesEntryEventBus {
  constructor(@Inject(MasterQueueService) private readonly queue: MasterQueueService) {}

  async publish(event: ExportSalesEntryDomainEvent) {
    await this.queue.enqueue({
      type: event.name,
      payload: { ...event },
    })
  }
}




