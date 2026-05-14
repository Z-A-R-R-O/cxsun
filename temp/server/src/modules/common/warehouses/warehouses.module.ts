import { Module } from "@nestjs/common";
import { commonMasterProviders } from "../infrastructure/common-master.providers";
import { WarehousesController } from "./warehouses.controller";

@Module({
  controllers: [WarehousesController],
  providers: [...commonMasterProviders],
})
export class WarehousesModule {}
