import { DomainEvent } from "@cxnext/core";

export type IndustryChangedPayload = Record<string, unknown> & {
  readonly id: string;
  readonly name: string;
  readonly isActive: boolean;
};

export class IndustryCreatedEvent extends DomainEvent<IndustryChangedPayload> {
  public constructor(aggregateId: string, payload: IndustryChangedPayload) {
    super("industries.industry-created", aggregateId, payload);
  }
}
