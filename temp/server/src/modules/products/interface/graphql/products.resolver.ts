import { Query, Resolver } from "@nestjs/graphql";
import { ProductModel } from "./product.model";

@Resolver(() => ProductModel)
export class ProductsResolver {
  @Query(() => String)
  public productsGraphqlPlaceholder() {
    return "products";
  }
}
