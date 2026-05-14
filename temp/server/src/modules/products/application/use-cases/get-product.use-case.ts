import { Inject, Injectable } from "@nestjs/common";
import { PRODUCT_REPOSITORY, type ProductRepository } from "../services/product.repository";

@Injectable()
export class GetProductUseCase {
  public constructor(
    @Inject(PRODUCT_REPOSITORY)
    private readonly productRepository: ProductRepository,
  ) {}

  public async execute(productId: string) {
    return this.productRepository.getById(productId);
  }
}
