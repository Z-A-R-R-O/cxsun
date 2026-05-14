import { Inject, Injectable } from "@nestjs/common";
import { createEvent, type EventBus } from "@cxnext/event";
import { EVENT_BUS } from "../../../../events/event.constants";
import type {
  ProductDomainEvent,
  ProductDomainEventPublisher,
} from "../../application/services/domain-event-publisher";

@Injectable()
export class EventBusProductDomainEventPublisher implements ProductDomainEventPublisher {
  public constructor(
    @Inject(EVENT_BUS)
    private readonly eventBus: EventBus,
  ) {}

  public async publishAll(events: readonly ProductDomainEvent[]): Promise<void> {
    await this.eventBus.publishAll(
      events.map((event) =>
        createEvent(
          event.eventName,
          {
            aggregateId: event.aggregateId,
            ...event.payload,
          },
          event.metadata,
        ),
      ),
    );
  }
}
