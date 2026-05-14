import { Module } from "@nestjs/common";
import { commonMasterProviders } from "../infrastructure/common-master.providers";
import { PaymentTermsController } from "./payment-terms.controller";

@Module({
  controllers: [PaymentTermsController],
  providers: [...commonMasterProviders],
})
export class PaymentTermsModule {}
