export class ProductSlug {
  private constructor(public readonly value: string) {}

  public static create(value: string): ProductSlug {
    const slug = slugify(value);

    if (slug.length < 2) {
      throw new Error("Product slug must be at least 2 characters.");
    }

    return new ProductSlug(slug);
  }
}

export function slugifyProductText(value: string): string {
  return slugify(value);
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
