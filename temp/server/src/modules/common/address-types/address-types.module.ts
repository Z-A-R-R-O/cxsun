import { Module } from "@nestjs/common";
import { commonMasterProviders } from "../infrastructure/common-master.providers";
import { AddressTypesController } from "./address-types.controller";

@Module({
  controllers: [AddressTypesController],
  providers: [...commonMasterProviders],
})
export class AddressTypesModule {}
