import { DomainEvent } from "@cxnext/core";

export type CompanyChangedPayload = Record<string, unknown> & {
  readonly id: string;
  readonly code: string;
  readonly name: string;
  readonly tenantId: string;
  readonly industryId: string;
  readonly isActive: boolean;
};

export class CompanyCreatedEvent extends DomainEvent<CompanyChangedPayload> {
  public constructor(aggregateId: string, payload: CompanyChangedPayload) {
    super("companies.company-created", aggregateId, payload);
  }
}
