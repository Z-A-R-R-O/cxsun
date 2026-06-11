import { AuthModule } from './auth/auth.module.js'
import { CompanyModule } from './master/company/company.module.js'
import { commonModuleClasses } from './common/index.js'
import { ContactsModule } from './master/contact/index.js'
import { HomeModule } from './home/home.module.js'
import { MasterDataModule } from './foundation/master-data/index.js'
import { OrdersModule } from './master/order/index.js'
import { ProductsModule } from './master/product/index.js'
import { SiteModule } from './site/index.js'
import { SalesEntryModule } from './entries/sales/index.js'
import { QuotationEntryModule } from './entries/quotation/index.js'
import { ExportSalesEntryModule } from './entries/export-sales/index.js'
import { PurchaseEntryModule } from './entries/purchase/index.js'
import { ReceiptEntryModule } from './entries/receipt/index.js'
import { PaymentEntryModule } from './entries/payment/index.js'
import { AccountsModule } from './accounts/index.js'
import { PurchaseReceiptModule } from './stock/inward/purchase-receipt/index.js'
import { DeliveryNoteModule } from './stock/outward/delivery-note/index.js'
import { StockLedgerModule } from './stock/ledger/index.js'
import { CompanySettingsModule } from './settings/company-settings/index.js'
import { DocumentSettingsModule } from './settings/document-settings/index.js'
import { GstComplianceModule } from './gst/gst-compliance/index.js'
import { MediaModule } from './media/index.js'
import { MailModule } from './mail/index.js'
import { TaskManagerModule } from './task-manager/index.js'
import { CrmModule } from './crm/index.js'
import { TallyModule } from './tally/index.js'
import { FrappeModule } from './frappe/index.js'
import { TConnectModule } from './tconnect/index.js'
import { AgentOsModule } from './agent-os/index.js'
import { AuditorContactCredentialModule } from './auditor/contact-credential/index.js'
import { AuditorGstFilingModule } from './auditor/gst-filing/index.js'
import { SystemUpdateModule } from '../core/system/system-update/system-update.module.js'
import { QueueManagerModule } from '../core/system/queue-manager/queue-manager.module.js'
import { DatabaseManagerModule } from '../core/system/database-manager/database-manager.module.js'
import { AppSetupModule } from '../framework/setup/app-setup/index.js'
import { HealthModule } from '../core/health/health.module.js'
import { IndustryModule } from '../core/industry/industry.module.js'
import { TenantDomainModule } from '../core/tenant-domain/tenant-domain.module.js'
import { TenantModule } from '../core/tenant/tenant.module.js'
import { Module } from '../core/decorators/module.js'
import { AuthAnyGuard } from '../core/guards/auth-any.guard.js'
import { AuthGuard } from '../core/guards/auth.guard.js'

@Module({
  imports: [
    HomeModule,
    HealthModule,
    SiteModule,
    SystemUpdateModule,
    QueueManagerModule,
    DatabaseManagerModule,
    AuthModule,
    TenantModule,
    TenantDomainModule,
    AppSetupModule,
    IndustryModule,
    ...commonModuleClasses,
    MasterDataModule,
    ContactsModule,
    ProductsModule,
    OrdersModule,
    SalesEntryModule,
    QuotationEntryModule,
    ExportSalesEntryModule,
    PurchaseEntryModule,
    PurchaseReceiptModule,
    DeliveryNoteModule,
    StockLedgerModule,
    ReceiptEntryModule,
    PaymentEntryModule,
    AccountsModule,
    CompanySettingsModule,
    DocumentSettingsModule,
    GstComplianceModule,
    MediaModule,
    MailModule,
    TaskManagerModule,
    CrmModule,
    TallyModule,
    FrappeModule,
    TConnectModule,
    AgentOsModule,
    AuditorContactCredentialModule,
    AuditorGstFilingModule,
    CompanyModule,
  ],
  guards: [AuthGuard, AuthAnyGuard],
})
export class AppModule {}
