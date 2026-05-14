import { Module } from "@nestjs/common";
import { commonMasterProviders } from "../infrastructure/common-master.providers";
import { SizesController } from "./sizes.controller";

@Module({
  controllers: [SizesController],
  providers: [...commonMasterProviders],
})
export class SizesModule {}
