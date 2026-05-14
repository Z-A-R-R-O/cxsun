import { Module } from "@nestjs/common";
import { commonMasterProviders } from "../infrastructure/common-master.providers";
import { ColoursController } from "./colours.controller";

@Module({
  controllers: [ColoursController],
  providers: [...commonMasterProviders],
})
export class ColoursModule {}
