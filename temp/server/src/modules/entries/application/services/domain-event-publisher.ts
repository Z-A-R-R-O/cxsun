import type { DomainEvent } from "@cxnext/core";

export interface EntriesDomainEventPublisher {
  publishAll(events: readonly DomainEvent[]): Promise<void>;
}

export const ENTRIES_DOMAIN_EVENT_PUBLISHER = Symbol("ENTRIES_DOMAIN_EVENT_PUBLISHER");
