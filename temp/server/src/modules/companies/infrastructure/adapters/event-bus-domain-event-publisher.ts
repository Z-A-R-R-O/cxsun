import { Inject, Injectable } from "@nestjs/common";
import type { DomainEvent } from "@cxnext/core";
import { createEvent, type EventBus } from "@cxnext/event";
import type { DomainEventPublisher } from "../../application/services/domain-event-publisher";
import { EVENT_BUS } from "../../../../events/event.constants";

@Injectable()
export class EventBusDomainEventPublisher implements DomainEventPublisher {
  public constructor(@Inject(EVENT_BUS) private readonly eventBus: EventBus) {}

  public async publishAll(events: readonly DomainEvent[]): Promise<void> {
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
