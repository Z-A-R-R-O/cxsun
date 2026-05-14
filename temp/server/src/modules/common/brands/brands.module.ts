import { Module } from "@nestjs/common";
import { commonMasterProviders } from "../infrastructure/common-master.providers";
import { BrandsController } from "./brands.controller";

@Module({
  controllers: [BrandsController],
  providers: [...commonMasterProviders],
})
export class BrandsModule {}
