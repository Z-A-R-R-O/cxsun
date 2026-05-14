import { Inject, Injectable } from "@nestjs/common";
import { ProductAggregate } from "../../domain/aggregates/product.aggregate";
import {
  PRODUCT_DOMAIN_EVENT_PUBLISHER,
  type ProductDomainEventPublisher,
} from "../services/domain-event-publisher";
import { PRODUCT_REPOSITORY, type ProductRepository } from "../services/product.repository";

@Injectable()
export class DeleteProductUseCase {
  public constructor(
    @Inject(PRODUCT_REPOSITORY)
    private readonly productRepository: ProductRepository,
    @Inject(PRODUCT_DOMAIN_EVENT_PUBLISHER)
    private readonly eventPublisher: ProductDomainEventPublisher,
  ) {}

  public async execute(productId: string) {
    const wasDeleted = await this.productRepository.softDelete(productId);

    if (wasDeleted) {
      await this.eventPublisher.publishAll([ProductAggregate.deletedEvent(productId)]);
    }

    return wasDeleted;
  }
}
