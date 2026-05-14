import { Module } from "@nestjs/common";
import { commonMasterProviders } from "../infrastructure/common-master.providers";
import { MonthsController } from "./months.controller";

@Module({
  controllers: [MonthsController],
  providers: [...commonMasterProviders],
})
export class MonthsModule {}
