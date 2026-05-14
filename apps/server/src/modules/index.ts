import { AuthModule } from './auth/auth.module.js'
import { CompanyModule } from './company/company.module.js'
import { HealthModule } from './health/health.module.js'
import { HomeModule } from './home/home.module.js'
import { IndustryModule } from './industry/industry.module.js'
import { SiteModule } from './site/index.js'
import { SystemUpdateModule } from './system-update/system-update.module.js'
import { TenantModule } from './tenant/tenant.module.js'
import { Module } from '../core/decorators/module.js'

@Module({
  imports: [
    HomeModule,
    HealthModule,
    SiteModule,
    SystemUpdateModule,
    AuthModule,
    TenantModule,
    IndustryModule,
    CompanyModule,
  ],
})
export class AppModule {}
