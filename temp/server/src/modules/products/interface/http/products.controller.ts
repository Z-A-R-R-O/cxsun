import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  NotFoundException,
  Param,
  Patch,
  Post,
} from "@nestjs/common";
import { RequirePermissions } from "../../../auth/interface/http/auth-context";
import { modulePermission } from "../../../auth/interface/http/module-permissions";
import { CreateProductUseCase } from "../../application/use-cases/create-product.use-case";
import { DeleteProductUseCase } from "../../application/use-cases/delete-product.use-case";
import { GenerateProductSeoFieldUseCase } from "../../application/use-cases/generate-product-seo-field.use-case";
import { GenerateProductSlugUseCase } from "../../application/use-cases/generate-product-slug.use-case";
import { GetProductUseCase } from "../../application/use-cases/get-product.use-case";
import { ListProductsUseCase } from "../../application/use-cases/list-products.use-case";
import { UpdateProductUseCase } from "../../application/use-cases/update-product.use-case";
import type { ProductUpsertParams } from "../../application/services/product.repository";
import { toProductResponse } from "./product-response";

@Controller("products")
export class ProductsController {
  public constructor(
    @Inject(ListProductsUseCase)
    private readonly listProductsUseCase: ListProductsUseCase,
    @Inject(GetProductUseCase)
    private readonly getProductUseCase: GetProductUseCase,
    @Inject(CreateProductUseCase)
    private readonly createProductUseCase: CreateProductUseCase,
    @Inject(UpdateProductUseCase)
    private readonly updateProductUseCase: UpdateProductUseCase,
    @Inject(DeleteProductUseCase)
    private readonly deleteProductUseCase: DeleteProductUseCase,
    @Inject(GenerateProductSlugUseCase)
    private readonly generateProductSlugUseCase: GenerateProductSlugUseCase,
    @Inject(GenerateProductSeoFieldUseCase)
    private readonly generateProductSeoFieldUseCase: GenerateProductSeoFieldUseCase,
  ) {}

  @Get()
  @RequirePermissions(modulePermission("product", "read"))
  public async list() {
    const products = await this.listProductsUseCase.execute();
    return products.map((product) => toProductResponse(product));
  }

  @Get(":productId")
  @RequirePermissions(modulePermission("product", "read"))
  public async getById(@Param("productId") productId: string) {
    const product = await this.getProductUseCase.execute(productId);

    if (!product) {
      throw new NotFoundException(`Product "${productId}" was not found.`);
    }

    return toProductResponse(product);
  }

  @Post()
  @RequirePermissions(modulePermission("product", "create"))
  public async create(@Body() body: ProductUpsertParams) {
    const product = await this.createProductUseCase.execute(parseProductRequest(body));
    return toProductResponse(product);
  }

  @Patch(":productId")
  @RequirePermissions(modulePermission("product", "update"))
  public async update(@Param("productId") productId: string, @Body() body: ProductUpsertParams) {
    const product = await this.updateProductUseCase.execute(productId, parseProductRequest(body));

    if (!product) {
      throw new NotFoundException(`Product "${productId}" was not found.`);
    }

    return toProductResponse(product);
  }

  @Delete(":productId")
  @RequirePermissions(modulePermission("product", "delete"))
  public async softDelete(@Param("productId") productId: string) {
    const wasDeleted = await this.deleteProductUseCase.execute(productId);

    if (!wasDeleted) {
      throw new NotFoundException(`Product "${productId}" was not found.`);
    }

    return { deleted: true };
  }

  @Post("generate-slug")
  @RequirePermissions(modulePermission("product", "update"))
  public generateSlug(@Body() body: { readonly text?: string }) {
    return this.generateProductSlugUseCase.execute(body.text ?? "");
  }

  @Post("generate-seo-field")
  @RequirePermissions(modulePermission("product", "update"))
  public generateSeoField(
    @Body()
    body: {
      readonly field?: "metaTitle" | "metaDescription" | "metaKeywords";
      readonly name?: string;
      readonly description?: string | null;
      readonly shortDescription?: string | null;
      readonly brandName?: string | null;
      readonly categoryName?: string | null;
      readonly productGroupName?: string | null;
      readonly tagNames?: readonly string[];
    },
  ) {
    return this.generateProductSeoFieldUseCase.execute({
      field: body.field ?? "metaTitle",
      name: body.name ?? "",
      description: body.description,
      shortDescription: body.shortDescription,
      brandName: body.brandName,
      categoryName: body.categoryName,
      productGroupName: body.productGroupName,
      tagNames: Array.isArray(body.tagNames) ? body.tagNames : [],
    });
  }
}

function parseProductRequest(body: ProductUpsertParams): ProductUpsertParams {
  return {
    ...body,
    code: toOptionalString(body.code),
    name: typeof body.name === "string" ? body.name : "",
    slug: toOptionalString(body.slug),
    description: toOptionalString(body.description),
    shortDescription: toOptionalString(body.shortDescription),
    brandId: toOptionalString(body.brandId),
    brandName: toOptionalString(body.brandName),
    categoryId: toOptionalString(body.categoryId),
    categoryName: toOptionalString(body.categoryName),
    productGroupId: toOptionalString(body.productGroupId),
    productGroupName: toOptionalString(body.productGroupName),
    productTypeId: toOptionalString(body.productTypeId),
    productTypeName: toOptionalString(body.productTypeName),
    sku: typeof body.sku === "string" ? body.sku : "",
    basePrice: Number(body.basePrice ?? 0),
    costPrice: Number(body.costPrice ?? 0),
    images: Array.isArray(body.images) ? body.images : [],
    variants: Array.isArray(body.variants) ? body.variants : [],
    prices: Array.isArray(body.prices) ? body.prices : [],
    discounts: Array.isArray(body.discounts) ? body.discounts : [],
    offers: Array.isArray(body.offers) ? body.offers : [],
    attributes: Array.isArray(body.attributes) ? body.attributes : [],
    attributeValues: Array.isArray(body.attributeValues) ? body.attributeValues : [],
    variantMap: Array.isArray(body.variantMap) ? body.variantMap : [],
    stockItems: Array.isArray(body.stockItems) ? body.stockItems : [],
    stockMovements: Array.isArray(body.stockMovements) ? body.stockMovements : [],
    tags: Array.isArray(body.tags) ? body.tags : [],
    reviews: Array.isArray(body.reviews) ? body.reviews : [],
  };
}

function toOptionalString(value: unknown) {
  return typeof value === "string" ? value : null;
}
