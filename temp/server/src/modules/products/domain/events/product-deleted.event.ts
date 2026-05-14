import { DomainEvent } from "@cxnext/core";

export class ProductDeletedEvent extends DomainEvent<Record<string, unknown>> {
  public constructor(productId: string, payload: Record<string, unknown>) {
    super("products.product-deleted", productId, payload);
  }
}
