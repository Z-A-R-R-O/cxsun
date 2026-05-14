import type { ProductRecord } from "../product-record";

export class ProductEntity {
  private constructor(private readonly record: ProductRecord) {}

  public static fromRecord(record: ProductRecord): ProductEntity {
    return new ProductEntity(record);
  }

  public get id() {
    return this.record.id;
  }

  public get code() {
    return this.record.code;
  }

  public get name() {
    return this.record.name;
  }

  public get slug() {
    return this.record.slug;
  }

  public get sku() {
    return this.record.sku;
  }

  public get isActive() {
    return this.record.isActive;
  }
}
