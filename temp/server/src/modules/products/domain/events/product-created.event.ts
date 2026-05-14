import { DomainEvent } from "@cxnext/core";

export class ProductCreatedEvent extends DomainEvent<Record<string, unknown>> {
  public constructor(productId: string, payload: Record<string, unknown>) {
    super("products.product-created", productId, payload);
  }
}
