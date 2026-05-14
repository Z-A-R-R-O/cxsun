import { DomainEvent } from "@cxnext/core";

export class ProductUpdatedEvent extends DomainEvent<Record<string, unknown>> {
  public constructor(productId: string, payload: Record<string, unknown>) {
    super("products.product-updated", productId, payload);
  }
}
