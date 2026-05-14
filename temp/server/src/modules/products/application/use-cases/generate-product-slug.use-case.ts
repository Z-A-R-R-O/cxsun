import { Injectable } from "@nestjs/common";
import { generateProductSlug } from "./product-upsert-normalizer";

@Injectable()
export class GenerateProductSlugUseCase {
  public execute(text: string) {
    return { slug: generateProductSlug(text) };
  }
}
