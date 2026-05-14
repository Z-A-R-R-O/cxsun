import { Module } from "@nestjs/common";
import { DOMAIN_EVENT_PUBLISHER } from "./application/services/domain-event-publisher";
import { GetTenantUseCase } from "./application/use-cases/get-tenant.use-case";
import { ListTenantsUseCase } from "./application/use-cases/list-tenants.use-case";
import { CreateTenantUseCase } from "./application/use-cases/create-tenant.use-case";
import { DeleteTenantUseCase } from "./application/use-cases/delete-tenant.use-case";
import { UpdateTenantUseCase } from "./application/use-cases/update-tenant.use-case";
import { TENANT_REPOSITORY } from "./application/services/tenant.repository";
import { EventBusDomainEventPublisher } from "./infrastructure/adapters/event-bus-domain-event-publisher";
import { KyselyTenantRepository } from "./infrastructure/persistence/kysely-tenant.repository";
import { TenantsResolver } from "./interface/graphql/tenants.resolver";
import { TenantsController } from "./interface/http/tenants.controller";
import { TenantsRegistryBootstrap } from "./tenants.registry";

@Module({
  controllers: [TenantsController],
  providers: [
    TenantsRegistryBootstrap,
    ListTenantsUseCase,
    GetTenantUseCase,
    CreateTenantUseCase,
    UpdateTenantUseCase,
    DeleteTenantUseCase,
    TenantsResolver,
    {
      provide: TENANT_REPOSITORY,
      useClass: KyselyTenantRepository,
    },
    {
      provide: DOMAIN_EVENT_PUBLISHER,
      useClass: EventBusDomainEventPublisher,
    },
  ],
})
export class TenantsModule {}
