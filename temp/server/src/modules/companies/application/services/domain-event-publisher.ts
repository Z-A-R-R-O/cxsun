import type { DomainEvent } from "@cxnext/core";

export interface DomainEventPublisher {
  publishAll(events: readonly DomainEvent[]): Promise<void>;
}

export const DOMAIN_EVENT_PUBLISHER = Symbol("COMPANY_DOMAIN_EVENT_PUBLISHER");
