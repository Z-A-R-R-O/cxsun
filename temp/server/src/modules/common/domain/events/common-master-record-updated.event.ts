import { DomainEvent } from "@cxnext/core";
import type { CommonMasterModuleKey } from "../value-objects/common-master-definition";

type CommonMasterRecordUpdatedPayload = Record<string, unknown> & {
  readonly moduleKey: CommonMasterModuleKey;
  readonly code: string | null;
  readonly name: string | null;
  readonly isActive: boolean;
};

export class CommonMasterRecordUpdatedEvent extends DomainEvent<CommonMasterRecordUpdatedPayload> {
  public constructor(aggregateId: string, payload: CommonMasterRecordUpdatedPayload) {
    super("common.master-record-updated", aggregateId, payload);
  }
}
