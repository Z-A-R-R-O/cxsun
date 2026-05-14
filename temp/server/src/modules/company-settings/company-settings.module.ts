import { Module } from "@nestjs/common";
import { CompanySettingsService } from "./application/company-settings.service";
import { CompanySettingsController } from "./interface/http/company-settings.controller";

@Module({
  controllers: [CompanySettingsController],
  providers: [CompanySettingsService],
  exports: [CompanySettingsService],
})
export class CompanySettingsModule {}
