import type { MoneyEntryRecord } from "../entry-record";

export class MoneyEntryEntity {
  private constructor(private readonly record: MoneyEntryRecord) {}

  public static fromRecord(record: MoneyEntryRecord): MoneyEntryEntity {
    return new MoneyEntryEntity(record);
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

  public get netAmount() {
    return this.record.netAmount;
  }
}
