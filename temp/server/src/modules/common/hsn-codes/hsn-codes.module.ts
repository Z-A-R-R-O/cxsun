import { Module } from "@nestjs/common";
import { commonMasterProviders } from "../infrastructure/common-master.providers";
import { HsnCodesController } from "./hsn-codes.controller";

@Module({
  controllers: [HsnCodesController],
  providers: [...commonMasterProviders],
})
export class HsnCodesModule {}
