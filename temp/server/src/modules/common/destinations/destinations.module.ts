import { Module } from "@nestjs/common";
import { commonMasterProviders } from "../infrastructure/common-master.providers";
import { DestinationsController } from "./destinations.controller";

@Module({
  controllers: [DestinationsController],
  providers: [...commonMasterProviders],
})
export class DestinationsModule {}
