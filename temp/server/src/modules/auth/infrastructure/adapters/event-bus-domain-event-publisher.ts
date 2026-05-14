import { Inject, Injectable } from "@nestjs/common";
import type { DomainEvent } from "@cxnext/core";
import { createEvent, type EventBus } from "@cxnext/event";
import { EVENT_BUS } from "../../../../events/event.constants";
import type { AuthDomainEventPublisher } from "../../application/services/domain-event-publisher";

@Injectable()
export class EventBusAuthDomainEventPublisher implements AuthDomainEventPublisher {
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
