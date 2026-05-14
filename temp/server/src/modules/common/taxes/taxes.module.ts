import { Module } from "@nestjs/common";
import { commonMasterProviders } from "../infrastructure/common-master.providers";
import { TaxesController } from "./taxes.controller";

@Module({
  controllers: [TaxesController],
  providers: [...commonMasterProviders],
})
export class TaxesModule {}
