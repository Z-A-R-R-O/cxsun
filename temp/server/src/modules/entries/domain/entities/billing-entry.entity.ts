import type { BillingEntryRecord } from "../entry-record";

export class BillingEntryEntity {
  private constructor(private readonly record: BillingEntryRecord) {}

  public static fromRecord(record: BillingEntryRecord): BillingEntryEntity {
    return new BillingEntryEntity(record);
  }

  public get id() {
    return this.record.id;
  }

  public get kind() {
    return this.record.kind;
  }

  public get documentNo() {
    return this.record.documentNo;
  }

  public get partyName() {
    return this.record.partyName;
  }

  public get grandTotal() {
    return this.record.grandTotal;
  }
}
