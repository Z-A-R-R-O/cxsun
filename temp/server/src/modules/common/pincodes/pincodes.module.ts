import { Module } from "@nestjs/common";
import { commonLocationProviders } from "../infrastructure/common-location.providers";
import { PincodesController } from "./pincodes.controller";

@Module({
  controllers: [PincodesController],
  providers: [...commonLocationProviders],
})
export class PincodesModule {}
