import type { ProductRecord } from "../product-record";
import { ProductEntity } from "../entities/product.entity";
import { ProductCreatedEvent } from "../events/product-created.event";
import { ProductDeletedEvent } from "../events/product-deleted.event";
import { ProductUpdatedEvent } from "../events/product-updated.event";

export class ProductAggregate {
  private constructor(private readonly product: ProductEntity) {}

  public static fromRecord(record: ProductRecord): ProductAggregate {
    return new ProductAggregate(ProductEntity.fromRecord(record));
  }

  public createdEvent(): ProductCreatedEvent {
    return new ProductCreatedEvent(this.product.id, this.payload());
  }

  public updatedEvent(): ProductUpdatedEvent {
    return new ProductUpdatedEvent(this.product.id, this.payload());
  }

  public static deletedEvent(productId: string): ProductDeletedEvent {
    return new ProductDeletedEvent(productId, { id: productId });
  }

  private payload() {
    return {
      id: this.product.id,
      code: this.product.code,
      name: this.product.name,
      slug: this.product.slug,
      sku: this.product.sku,
      isActive: this.product.isActive,
    };
  }
}
