import { DomainEvent } from "@cxnext/core";

type IndustryDeletedPayload = Record<string, unknown> & {
  readonly id: string;
};

export class IndustryDeletedEvent extends DomainEvent<IndustryDeletedPayload> {
  public constructor(aggregateId: string, payload: IndustryDeletedPayload) {
    super("industries.industry-deleted", aggregateId, payload);
  }
}
