import type { DomainEvent } from "@cxnext/core";

export interface DomainEventPublisher {
  publishAll(events: readonly DomainEvent[]): Promise<void>;
}

export const COMMON_DOMAIN_EVENT_PUBLISHER = Symbol("COMMON_DOMAIN_EVENT_PUBLISHER");
