import { Module } from "@nestjs/common";
import { DOMAIN_EVENT_PUBLISHER } from "./application/services/domain-event-publisher";
import { INDUSTRY_REPOSITORY } from "./application/services/industry.repository";
import { CreateIndustryUseCase } from "./application/use-cases/create-industry.use-case";
import { DeleteIndustryUseCase } from "./application/use-cases/delete-industry.use-case";
import { GetIndustryUseCase } from "./application/use-cases/get-industry.use-case";
import { ListIndustriesUseCase } from "./application/use-cases/list-industries.use-case";
import { UpdateIndustryUseCase } from "./application/use-cases/update-industry.use-case";
import { KyselyIndustryRepository } from "./infrastructure/persistence/kysely-industry.repository";
import { EventBusDomainEventPublisher } from "./infrastructure/adapters/event-bus-domain-event-publisher";
import { IndustriesResolver } from "./interface/graphql/industries.resolver";
import { IndustriesController } from "./interface/http/industries.controller";
import { IndustriesRegistryBootstrap } from "./industries.registry";

@Module({
  controllers: [IndustriesController],
  providers: [
    IndustriesRegistryBootstrap,
    ListIndustriesUseCase,
    GetIndustryUseCase,
    CreateIndustryUseCase,
    UpdateIndustryUseCase,
    DeleteIndustryUseCase,
    IndustriesResolver,
    {
      provide: INDUSTRY_REPOSITORY,
      useClass: KyselyIndustryRepository,
    },
    {
      provide: DOMAIN_EVENT_PUBLISHER,
      useClass: EventBusDomainEventPublisher,
    },
  ],
})
export class IndustriesModule {}
