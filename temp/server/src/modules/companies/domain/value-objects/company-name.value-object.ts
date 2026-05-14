export class CompanyName {
  private constructor(public readonly value: string) {}

  public static from(value: string): CompanyName {
    const trimmed = value.trim();

    if (!trimmed) {
      throw new Error("Company name is required.");
    }

    return new CompanyName(trimmed);
  }
}
