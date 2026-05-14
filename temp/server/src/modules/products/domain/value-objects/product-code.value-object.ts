export class ProductCode {
  private constructor(public readonly value: string) {}

  public static create(value: string): ProductCode {
    const code = value.trim().toUpperCase();

    if (code.length < 2) {
      throw new Error("Product code must be at least 2 characters.");
    }

    return new ProductCode(code);
  }
}
