import { Module } from "@nestjs/common";
import { commonMasterProviders } from "../infrastructure/common-master.providers";
import { StockRejectionTypesController } from "./stock-rejection-types.controller";

@Module({
  controllers: [StockRejectionTypesController],
  providers: [...commonMasterProviders],
})
export class StockRejectionTypesModule {}
