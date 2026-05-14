import { Module } from "@nestjs/common";
import { CreateProductUseCase } from "./application/use-cases/create-product.use-case";
import { DeleteProductUseCase } from "./application/use-cases/delete-product.use-case";
import { GenerateProductSeoFieldUseCase } from "./application/use-cases/generate-product-seo-field.use-case";
import { GenerateProductSlugUseCase } from "./application/use-cases/generate-product-slug.use-case";
import { GetProductUseCase } from "./application/use-cases/get-product.use-case";
import { ListProductsUseCase } from "./application/use-cases/list-products.use-case";
import { UpdateProductUseCase } from "./application/use-cases/update-product.use-case";
import { productProviders } from "./infrastructure/products.providers";
import { ProductsResolver } from "./interface/graphql/products.resolver";
import { ProductsController } from "./interface/http/products.controller";
import { ProductsRegistryBootstrap } from "./products.registry";

@Module({
  controllers: [ProductsController],
  providers: [
    ProductsRegistryBootstrap,
    ListProductsUseCase,
    GetProductUseCase,
    CreateProductUseCase,
    UpdateProductUseCase,
    DeleteProductUseCase,
    GenerateProductSlugUseCase,
    GenerateProductSeoFieldUseCase,
    ProductsResolver,
    ...productProviders,
  ],
})
export class ProductsModule {}
