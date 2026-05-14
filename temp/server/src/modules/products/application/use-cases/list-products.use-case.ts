import { Inject, Injectable } from "@nestjs/common";
import { PRODUCT_REPOSITORY, type ProductRepository } from "../services/product.repository";

@Injectable()
export class ListProductsUseCase {
  public constructor(
    @Inject(PRODUCT_REPOSITORY)
    private readonly productRepository: ProductRepository,
  ) {}

  public async execute() {
    return this.productRepository.list();
  }
}
