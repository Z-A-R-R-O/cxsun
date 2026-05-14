import { Module } from "@nestjs/common";
import { DocumentNumberService } from "./application/document-number.service";
import { DocumentSettingsController } from "./interface/http/document-settings.controller";

@Module({
  controllers: [DocumentSettingsController],
  providers: [DocumentNumberService],
  exports: [DocumentNumberService],
})
export class DocumentSettingsModule {}
