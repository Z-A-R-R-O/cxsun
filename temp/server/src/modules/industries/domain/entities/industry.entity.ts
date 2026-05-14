import type { IndustryRecord } from "../industry-record";

export class IndustryEntity {
  private constructor(private readonly record: IndustryRecord) {}

  public static fromRecord(record: IndustryRecord): IndustryEntity {
    return new IndustryEntity(record);
  }

  public get id(): string {
    return this.record.id;
  }

  public get name(): string {
    return this.record.name;
  }

  public get code(): string {
    return this.record.code;
  }

  public get isActive(): boolean {
    return this.record.isActive;
  }
}
