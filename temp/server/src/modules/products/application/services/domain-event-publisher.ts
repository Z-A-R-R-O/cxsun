import type { ProductCreatedEvent } from "../../domain/events/product-created.event";
import type { ProductDeletedEvent } from "../../domain/events/product-deleted.event";
import type { ProductUpdatedEvent } from "../../domain/events/product-updated.event";

export type ProductDomainEvent = ProductCreatedEvent | ProductUpdatedEvent | ProductDeletedEvent;

export interface ProductDomainEventPublisher {
  publishAll(events: readonly ProductDomainEvent[]): Promise<void>;
}

export const PRODUCT_DOMAIN_EVENT_PUBLISHER = Symbol("PRODUCT_DOMAIN_EVENT_PUBLISHER");
