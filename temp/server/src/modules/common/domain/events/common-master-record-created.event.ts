import { DomainEvent } from "@cxnext/core";
import type { CommonMasterModuleKey } from "../value-objects/common-master-definition";

type CommonMasterRecordCreatedPayload = Record<string, unknown> & {
  readonly moduleKey: CommonMasterModuleKey;
  readonly code: string | null;
  readonly name: string | null;
  readonly isActive: boolean;
};

export class CommonMasterRecordCreatedEvent extends DomainEvent<CommonMasterRecordCreatedPayload> {
  public constructor(aggregateId: string, payload: CommonMasterRecordCreatedPayload) {
    super("common.master-record-created", aggregateId, payload);
  }
}
