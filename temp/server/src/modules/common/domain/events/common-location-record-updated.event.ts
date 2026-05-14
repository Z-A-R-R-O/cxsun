import { DomainEvent } from "@cxnext/core";
import type { CommonLocationModuleKey } from "../value-objects/common-location-definition";

type CommonLocationRecordUpdatedPayload = Record<string, unknown> & {
  readonly moduleKey: CommonLocationModuleKey;
  readonly code: string;
  readonly name: string | null;
  readonly isActive: boolean;
};

export class CommonLocationRecordUpdatedEvent extends DomainEvent<CommonLocationRecordUpdatedPayload> {
  public constructor(aggregateId: string, payload: CommonLocationRecordUpdatedPayload) {
    super("common.location-record-updated", aggregateId, payload);
  }
}
