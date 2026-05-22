import { Module } from '../../../core/decorators/module.js'
import { TenantContextService } from '../../../core/tenant/tenant-context.service.js'
import { CompanySettingsService } from './application/company-settings.service.js'
import { CompanySettingsRepository } from './infrastructure/company-settings.repository.js'
import { CompanySettingsV1Controller } from './interface/http/company-settings-v1.controller.js'

@Module({
  controllers: [CompanySettingsV1Controller],
  providers: [TenantContextService, CompanySettingsService, CompanySettingsRepository],
})
export class CompanySettingsModule {}

