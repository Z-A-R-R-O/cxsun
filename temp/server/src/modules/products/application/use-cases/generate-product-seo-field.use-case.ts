import { Injectable } from "@nestjs/common";
import { generateProductSeoField } from "./product-upsert-normalizer";

export interface GenerateProductSeoFieldParams {
  readonly field: "metaTitle" | "metaDescription" | "metaKeywords";
  readonly name: string;
  readonly description?: string | null;
  readonly shortDescription?: string | null;
  readonly brandName?: string | null;
  readonly categoryName?: string | null;
  readonly productGroupName?: string | null;
  readonly tagNames?: readonly string[];
}

@Injectable()
export class GenerateProductSeoFieldUseCase {
  public execute(params: GenerateProductSeoFieldParams) {
    return { field: params.field, value: generateProductSeoField(params) };
  }
}
