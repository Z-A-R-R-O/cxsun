import { Module } from "@nestjs/common";
import { commonLocationProviders } from "../infrastructure/common-location.providers";
import { StatesController } from "./states.controller";

@Module({
  controllers: [StatesController],
  providers: [...commonLocationProviders],
})
export class StatesModule {}
