import { DomainEvent } from "@cxnext/core";

type CompanyDeletedPayload = Record<string, unknown> & {
  readonly id: string;
};

export class CompanyDeletedEvent extends DomainEvent<CompanyDeletedPayload> {
  public constructor(aggregateId: string, payload: CompanyDeletedPayload) {
    super("companies.company-deleted", aggregateId, payload);
  }
}
