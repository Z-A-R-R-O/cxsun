import { Module } from "@nestjs/common";
import { commonMasterProviders } from "../infrastructure/common-master.providers";
import { ContactTypesController } from "./contact-types.controller";

@Module({
  controllers: [ContactTypesController],
  providers: [...commonMasterProviders],
})
export class ContactTypesModule {}
