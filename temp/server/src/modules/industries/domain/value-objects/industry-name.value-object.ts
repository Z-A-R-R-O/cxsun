export class IndustryName {
  private constructor(public readonly value: string) {}

  public static from(value: string): IndustryName {
    const trimmed = value.trim();

    if (!trimmed) {
      throw new Error("Industry name is required.");
    }

    return new IndustryName(trimmed);
  }
}
