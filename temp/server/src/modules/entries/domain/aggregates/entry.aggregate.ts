import type { BillingEntryRecord, EntryKind, MoneyEntryRecord } from "../entry-record";
import { EntryCreatedEvent } from "../events/entry-created.event";
import { EntryDeletedEvent } from "../events/entry-deleted.event";
import { EntryUpdatedEvent } from "../events/entry-updated.event";

export class EntryAggregate {
  private constructor(private readonly record: BillingEntryRecord | MoneyEntryRecord) {}

  public static fromRecord(record: BillingEntryRecord | MoneyEntryRecord): EntryAggregate {
    return new EntryAggregate(record);
  }

  public createdEvent(): EntryCreatedEvent {
    return new EntryCreatedEvent(
      eventName(this.record.kind, "created"),
      this.record.id,
      this.payload(),
    );
  }

  public updatedEvent(): EntryUpdatedEvent {
    return new EntryUpdatedEvent(
      eventName(this.record.kind, "updated"),
      this.record.id,
      this.payload(),
    );
  }

  public static deletedEvent(kind: EntryKind, entryId: string): EntryDeletedEvent {
    return new EntryDeletedEvent(eventName(kind, "deleted"), entryId, { id: entryId, kind });
  }

  private payload() {
    return {
      id: this.record.id,
      kind: this.record.kind,
      documentNo: this.record.documentNo,
      partyName: this.record.partyName,
    };
  }
}

function eventName(kind: EntryKind, action: "created" | "updated" | "deleted") {
  return `entries.${kind === "sales" ? "sale" : kind}-${action}`;
}
