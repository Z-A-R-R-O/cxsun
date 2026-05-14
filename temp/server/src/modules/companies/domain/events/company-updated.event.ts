import { DomainEvent } from "@cxnext/core";
import type { CompanyChangedPayload } from "./company-created.event";

export class CompanyUpdatedEvent extends DomainEvent<CompanyChangedPayload> {
  public constructor(aggregateId: string, payload: CompanyChangedPayload) {
    super("companies.company-updated", aggregateId, payload);
  }
}
