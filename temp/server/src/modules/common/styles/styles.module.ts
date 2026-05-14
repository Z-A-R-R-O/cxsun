import { Module } from "@nestjs/common";
import { commonMasterProviders } from "../infrastructure/common-master.providers";
import { StylesController } from "./styles.controller";

@Module({
  controllers: [StylesController],
  providers: [...commonMasterProviders],
})
export class StylesModule {}
