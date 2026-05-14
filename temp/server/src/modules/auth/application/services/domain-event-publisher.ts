import type { DomainEvent } from "@cxnext/core";

export interface AuthDomainEventPublisher {
  publishAll(events: readonly DomainEvent[]): Promise<void>;
}

export const AUTH_DOMAIN_EVENT_PUBLISHER = Symbol("AUTH_DOMAIN_EVENT_PUBLISHER");
