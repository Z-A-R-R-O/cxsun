import { Module } from "@nestjs/common";
import { commonMasterProviders } from "../infrastructure/common-master.providers";
import { CurrenciesController } from "./currencies.controller";

@Module({
  controllers: [CurrenciesController],
  providers: [...commonMasterProviders],
})
export class CurrenciesModule {}
