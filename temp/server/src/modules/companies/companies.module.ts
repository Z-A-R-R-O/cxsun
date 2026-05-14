import { Module } from "@nestjs/common";
import {
  COMPANY_INDUSTRY_NAME_LOOKUP,
  COMPANY_TENANT_NAME_LOOKUP,
} from "./application/services/company-reference-lookup";
import { DOMAIN_EVENT_PUBLISHER } from "./application/services/domain-event-publisher";
import { COMPANY_REPOSITORY } from "./application/services/company.repository";
import { CreateCompanyUseCase } from "./application/use-cases/create-company.use-case";
import { DeleteCompanyUseCase } from "./application/use-cases/delete-company.use-case";
import { GetCompanyUseCase } from "./application/use-cases/get-company.use-case";
import { ListCompaniesUseCase } from "./application/use-cases/list-companies.use-case";
import { UpdateCompanyUseCase } from "./application/use-cases/update-company.use-case";
import { CompaniesRegistryBootstrap } from "./companies.registry";
import { EventBusDomainEventPublisher } from "./infrastructure/adapters/event-bus-domain-event-publisher";
import { KyselyIndustryNameLookup } from "./infrastructure/adapters/kysely-industry-name-lookup";
import { KyselyTenantNameLookup } from "./infrastructure/adapters/kysely-tenant-name-lookup";
import { KyselyCompanyRepository } from "./infrastructure/persistence/kysely-company.repository";
import { CompaniesResolver } from "./interface/graphql/companies.resolver";
import { CompaniesController } from "./interface/http/companies.controller";

@Module({
  controllers: [CompaniesController],
  providers: [
    CompaniesRegistryBootstrap,
    ListCompaniesUseCase,
    GetCompanyUseCase,
    CreateCompanyUseCase,
    UpdateCompanyUseCase,
    DeleteCompanyUseCase,
    CompaniesResolver,
    {
      provide: COMPANY_REPOSITORY,
      useClass: KyselyCompanyRepository,
    },
    {
      provide: DOMAIN_EVENT_PUBLISHER,
      useClass: EventBusDomainEventPublisher,
    },
    {
      provide: COMPANY_TENANT_NAME_LOOKUP,
      useClass: KyselyTenantNameLookup,
    },
    {
      provide: COMPANY_INDUSTRY_NAME_LOOKUP,
      useClass: KyselyIndustryNameLookup,
    },
  ],
})
export class CompaniesModule {}
