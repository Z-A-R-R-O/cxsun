export class ContactCode {
  private constructor(public readonly value: string) {}

  public static create(value: string): ContactCode {
    const normalizedValue = value.trim().toUpperCase();

    if (!/^[A-Z][A-Z0-9-]{0,31}$/.test(normalizedValue)) {
      throw new Error(
        "Contact code must start with a letter and contain letters, numbers, or hyphens.",
      );
    }

    return new ContactCode(normalizedValue);
  }
}
