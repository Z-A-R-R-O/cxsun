import { ValueObject } from "@cxnext/core";

type TenantSlugProps = Record<string, unknown> & {
  readonly value: string;
};

export class TenantSlug extends ValueObject<TenantSlugProps> {
  private constructor(props: TenantSlugProps) {
    super(props);
  }

  public static create(value: string): TenantSlug {
    const normalizedValue = value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    if (normalizedValue.length < 2) {
      throw new Error("Tenant slug must contain at least two characters.");
    }

    return new TenantSlug({ value: normalizedValue });
  }

  public get value(): string {
    return this.props.value;
  }
}
