import { Module } from "@nestjs/common";
import { commonMasterProviders } from "../infrastructure/common-master.providers";
import { UnitsController } from "./units.controller";

@Module({
  controllers: [UnitsController],
  providers: [...commonMasterProviders],
})
export class UnitsModule {}
