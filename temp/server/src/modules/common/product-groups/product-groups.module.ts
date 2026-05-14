import { Module } from "@nestjs/common";
import { commonMasterProviders } from "../infrastructure/common-master.providers";
import { ProductGroupsController } from "./product-groups.controller";

@Module({
  controllers: [ProductGroupsController],
  providers: [...commonMasterProviders],
})
export class ProductGroupsModule {}
