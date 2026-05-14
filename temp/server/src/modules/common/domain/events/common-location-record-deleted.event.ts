import { DomainEvent } from "@cxnext/core";
import type { CommonLocationModuleKey } from "../value-objects/common-location-definition";

type CommonLocationRecordDeletedPayload = Record<string, unknown> & {
  readonly moduleKey: CommonLocationModuleKey;
};

export class CommonLocationRecordDeletedEvent extends DomainEvent<CommonLocationRecordDeletedPayload> {
  public constructor(aggregateId: string, payload: CommonLocationRecordDeletedPayload) {
    super("common.location-record-deleted", aggregateId, payload);
  }
}
