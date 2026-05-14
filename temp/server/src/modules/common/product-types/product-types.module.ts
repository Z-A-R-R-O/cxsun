import { Module } from "@nestjs/common";
import { commonMasterProviders } from "../infrastructure/common-master.providers";
import { ProductTypesController } from "./product-types.controller";

@Module({
  controllers: [ProductTypesController],
  providers: [...commonMasterProviders],
})
export class ProductTypesModule {}
