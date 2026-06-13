import { Module } from '../../../core/decorators/module.js'
import { CompanySettingsService } from './application/company-settings.service.js'
import { CompanySettingsRepository } from './infrastructure/company-settings.repository.js'
import { CompanySettingsV1Controller } from './interface/http/company-settings-v1.controller.js'

@Module({
  controllers: [CompanySettingsV1Controller],
  providers: [CompanySettingsService, CompanySettingsRepository],
})
export class CompanySettingsModule {}

