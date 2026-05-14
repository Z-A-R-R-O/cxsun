import { Module } from "@nestjs/common";
import { commonLocationProviders } from "../infrastructure/common-location.providers";
import { CountriesController } from "./countries.controller";

@Module({
  controllers: [CountriesController],
  providers: [...commonLocationProviders],
})
export class CountriesModule {}
