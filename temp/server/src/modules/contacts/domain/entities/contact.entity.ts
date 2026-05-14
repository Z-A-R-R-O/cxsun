import type { ContactRecord } from "../contact-record";

export class ContactEntity {
  private constructor(private readonly record: ContactRecord) {}

  public static fromRecord(record: ContactRecord): ContactEntity {
    return new ContactEntity(record);
  }

  public get id(): string {
    return this.record.id;
  }

  public get code(): string {
    return this.record.code;
  }

  public get name(): string {
    return this.record.name;
  }

  public get contactTypeId(): string | null {
    return this.record.contactTypeId;
  }

  public get ledgerId(): string | null {
    return this.record.ledgerId;
  }

  public get isActive(): boolean {
    return this.record.isActive;
  }
}
