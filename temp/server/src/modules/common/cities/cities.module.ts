import { Module } from "@nestjs/common";
import { commonLocationProviders } from "../infrastructure/common-location.providers";
import { CitiesController } from "./cities.controller";

@Module({
  controllers: [CitiesController],
  providers: [...commonLocationProviders],
})
export class CitiesModule {}
