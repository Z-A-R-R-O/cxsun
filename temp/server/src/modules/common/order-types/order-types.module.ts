import { Module } from "@nestjs/common";
import { commonMasterProviders } from "../infrastructure/common-master.providers";
import { OrderTypesController } from "./order-types.controller";

@Module({
  controllers: [OrderTypesController],
  providers: [...commonMasterProviders],
})
export class OrderTypesModule {}
