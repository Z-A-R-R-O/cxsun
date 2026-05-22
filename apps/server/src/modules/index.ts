import { AuthModule } from './auth/auth.module.js'
import { ClientModule } from './crm/client/client.module.js'
import { CompanyModule } from './master/company/company.module.js'
import { commonModuleClasses } from './common/index.js'
import { ContactsModule } from './master/contact/index.js'
import { HomeModule } from './home/home.module.js'
import { MasterDataModule } from './foundation/master-data/index.js'
import { OrdersModule } from './master/order/index.js'
import { ProductsModule } from './master/product/index.js'
import { SiteModule } from './site/index.js'
import { SalesEntryModule } from './entries/sales/index.js'
import { CompanySettingsModule } from './settings/company-settings/index.js'
import { DocumentSettingsModule } from './settings/document-settings/index.js'
import { SystemUpdateModule } from '../core/system/system-update/system-update.module.js'
import { HealthModule } from '../core/health/health.module.js'
import { IndustryModule } from '../core/industry/industry.module.js'
import { TenantDomainModule } from '../core/tenant-domain/tenant-domain.module.js'
import { TenantModule } from '../core/tenant/tenant.module.js'
import { Module } from '../core/decorators/module.js'
import { AuthGuard } from '../core/guards/auth.guard.js'

@Module({
  imports: [
    HomeModule,
    HealthModule,
    SiteModule,
    SystemUpdateModule,
    AuthModule,
    TenantModule,
    TenantDomainModule,
    ClientModule,
    IndustryModule,
    ...commonModuleClasses,
    MasterDataModule,
    ContactsModule,
    ProductsModule,
    OrdersModule,
    SalesEntryModule,
    CompanySettingsModule,
    DocumentSettingsModule,
    CompanyModule,
  ],
  guards: [AuthGuard],
})
export class AppModule {}
