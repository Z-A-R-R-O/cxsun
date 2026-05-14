import { Module } from "@nestjs/common";
import { commonMasterProviders } from "../infrastructure/common-master.providers";
import { BankNamesController } from "./bank-names.controller";

@Module({
  controllers: [BankNamesController],
  providers: [...commonMasterProviders],
})
export class BankNamesModule {}
