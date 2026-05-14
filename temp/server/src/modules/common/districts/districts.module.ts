import { Module } from "@nestjs/common";
import { commonLocationProviders } from "../infrastructure/common-location.providers";
import { DistrictsController } from "./districts.controller";

@Module({
  controllers: [DistrictsController],
  providers: [...commonLocationProviders],
})
export class DistrictsModule {}
