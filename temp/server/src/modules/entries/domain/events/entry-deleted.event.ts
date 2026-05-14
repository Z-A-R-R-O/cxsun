import { DomainEvent } from "@cxnext/core";

export class EntryDeletedEvent extends DomainEvent<Record<string, unknown>> {
  public constructor(eventName: string, entryId: string, payload: Record<string, unknown>) {
    super(eventName, entryId, payload);
  }
}
