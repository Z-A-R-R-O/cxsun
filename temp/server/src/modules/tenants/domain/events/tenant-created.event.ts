import { DomainEvent } from "@cxnext/core";

type TenantCreatedPayload = Record<string, unknown> & {
  readonly name: string;
  readonly slug: string;
  readonly isActive: boolean;
};

export class TenantCreatedEvent extends DomainEvent<TenantCreatedPayload> {
  public constructor(aggregateId: string, payload: TenantCreatedPayload) {
    super("tenants.tenant-created", aggregateId, payload);
  }
}
