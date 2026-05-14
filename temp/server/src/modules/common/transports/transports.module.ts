import { Module } from "@nestjs/common";
import { commonMasterProviders } from "../infrastructure/common-master.providers";
import { TransportsController } from "./transports.controller";

@Module({
  controllers: [TransportsController],
  providers: [...commonMasterProviders],
})
export class TransportsModule {}
