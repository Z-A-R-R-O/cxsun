import { DomainEvent } from "@cxnext/core";
import type { IndustryChangedPayload } from "./industry-created.event";

export class IndustryUpdatedEvent extends DomainEvent<IndustryChangedPayload> {
  public constructor(aggregateId: string, payload: IndustryChangedPayload) {
    super("industries.industry-updated", aggregateId, payload);
  }
}
