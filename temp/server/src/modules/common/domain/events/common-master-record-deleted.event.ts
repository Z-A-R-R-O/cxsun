import { DomainEvent } from "@cxnext/core";
import type { CommonMasterModuleKey } from "../value-objects/common-master-definition";

type CommonMasterRecordDeletedPayload = Record<string, unknown> & {
  readonly moduleKey: CommonMasterModuleKey;
  readonly force: boolean;
};

export class CommonMasterRecordDeletedEvent extends DomainEvent<CommonMasterRecordDeletedPayload> {
  public constructor(aggregateId: string, payload: CommonMasterRecordDeletedPayload) {
    super("common.master-record-deleted", aggregateId, payload);
  }
}
