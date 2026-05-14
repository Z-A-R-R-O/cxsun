import { DomainEvent } from "@cxnext/core";
import type { CommonLocationModuleKey } from "../value-objects/common-location-definition";

type CommonLocationRecordCreatedPayload = Record<string, unknown> & {
  readonly moduleKey: CommonLocationModuleKey;
  readonly code: string;
  readonly name: string | null;
  readonly isActive: boolean;
};

export class CommonLocationRecordCreatedEvent extends DomainEvent<CommonLocationRecordCreatedPayload> {
  public constructor(aggregateId: string, payload: CommonLocationRecordCreatedPayload) {
    super("common.location-record-created", aggregateId, payload);
  }
}
