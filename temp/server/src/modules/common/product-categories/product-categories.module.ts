import { Module } from "@nestjs/common";
import { commonMasterProviders } from "../infrastructure/common-master.providers";
import { ProductCategoriesController } from "./product-categories.controller";

@Module({
  controllers: [ProductCategoriesController],
  providers: [...commonMasterProviders],
})
export class ProductCategoriesModule {}
