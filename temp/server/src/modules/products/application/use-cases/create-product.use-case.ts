import { Inject, Injectable } from "@nestjs/common";
import { ProductAggregate } from "../../domain/aggregates/product.aggregate";
import {
  PRODUCT_DOMAIN_EVENT_PUBLISHER,
  type ProductDomainEventPublisher,
} from "../services/domain-event-publisher";
import {
  PRODUCT_REPOSITORY,
  type ProductRepository,
  type ProductUpsertParams,
} from "../services/product.repository";
import { assertProductCanBeSaved, normalizeProductUpsert } from "./product-upsert-normalizer";

@Injectable()
export class CreateProductUseCase {
  public constructor(
    @Inject(PRODUCT_REPOSITORY)
    private readonly productRepository: ProductRepository,
    @Inject(PRODUCT_DOMAIN_EVENT_PUBLISHER)
    private readonly eventPublisher: ProductDomainEventPublisher,
  ) {}

  public async execute(params: ProductUpsertParams) {
    const products = await this.productRepository.list();
    const normalizedParams = normalizeProductUpsert(params, products);
    assertProductCanBeSaved(products, normalizedParams);
    const product = await this.productRepository.create(normalizedParams);
    await this.eventPublisher.publishAll([ProductAggregate.fromRecord(product).createdEvent()]);
    return product;
  }
}
