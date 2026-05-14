import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ApolloDriver, type ApolloDriverConfig } from "@nestjs/apollo";
import { GraphQLModule } from "@nestjs/graphql";
import { HealthModule } from "./common/health/health.module";
import { AuthModule } from "./modules/auth/auth.module";
import { ApplicationContextModule } from "./modules/application-context/application-context.module";
import { GraphqlFoundationModule } from "./common/graphql/graphql-foundation.module";
import { CoreModule } from "./core/core.module";
import { EventsModule } from "./events/events.module";
import { CompaniesModule } from "./modules/companies/companies.module";
import { CommonModule } from "./modules/common/common.module";
import { CompanySettingsModule } from "./modules/company-settings/company-settings.module";
import { ContactsModule } from "./modules/contacts/contacts.module";
import { EntriesModule } from "./modules/entries/entries.module";
import { DocumentSettingsModule } from "./modules/document-settings/document-settings.module";
import { IndustriesModule } from "./modules/industries/industries.module";
import { MediaModule } from "./modules/media/media.module";
import { MailModule } from "./modules/mail/mail.module";
import { ProductsModule } from "./modules/products/products.module";
import { QueueModule } from "./modules/queue/queue.module";
import { StockModule } from "./modules/stock/stock.module";
import { TenantsModule } from "./modules/tenants/tenants.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
    }),
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: true,
      sortSchema: true,
    }),
    ApplicationContextModule,
    AuthModule,
    CompaniesModule,
    CompanySettingsModule,
    CommonModule,
    ContactsModule,
    CoreModule,
    DocumentSettingsModule,
    EntriesModule,
    EventsModule,
    IndustriesModule,
    MailModule,
    MediaModule,
    ProductsModule,
    QueueModule,
    StockModule,
    TenantsModule,
    GraphqlFoundationModule,
    HealthModule,
  ],
})
export class AppModule {}
