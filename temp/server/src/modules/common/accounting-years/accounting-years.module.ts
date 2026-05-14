import { Module } from "@nestjs/common";
import { commonMasterProviders } from "../infrastructure/common-master.providers";
import { AccountingYearsController } from "./accounting-years.controller";

@Module({
  controllers: [AccountingYearsController],
  providers: [...commonMasterProviders],
})
export class AccountingYearsModule {}
