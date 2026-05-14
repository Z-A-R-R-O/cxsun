import type { CompanyRecord } from "../company-record";

export class CompanyEntity {
  private constructor(private readonly record: CompanyRecord) {}

  public static fromRecord(record: CompanyRecord): CompanyEntity {
    return new CompanyEntity(record);
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

  public get tenantId(): string {
    return this.record.tenantId;
  }

  public get industryId(): string {
    return this.record.industryId;
  }

  public get isActive(): boolean {
    return this.record.isActive;
  }
}
