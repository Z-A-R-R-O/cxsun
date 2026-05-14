export class EntryNumber {
  private constructor(public readonly value: string) {}

  public static create(value: string, fallbackPrefix: string): EntryNumber {
    const normalized = value.trim().toUpperCase();

    if (normalized.length >= 2) {
      return new EntryNumber(normalized);
    }

    return new EntryNumber(`${fallbackPrefix}-DRAFT`);
  }
}
