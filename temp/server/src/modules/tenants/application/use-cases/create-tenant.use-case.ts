import { Inject, Injectable } from "@nestjs/common";
import {
  TENANT_REPOSITORY,
  type TenantRepository,
  type TenantUpsertParams,
} from "../services/tenant.repository";
import {
  DOMAIN_EVENT_PUBLISHER,
  type DomainEventPublisher,
} from "../services/domain-event-publisher";
import { TenantCreatedEvent } from "../../domain/events/tenant-created.event";

@Injectable()
export class CreateTenantUseCase {
  public constructor(
    @Inject(TENANT_REPOSITORY) private readonly tenantRepository: TenantRepository,
    @Inject(DOMAIN_EVENT_PUBLISHER) private readonly domainEventPublisher: DomainEventPublisher,
  ) {}

  public async execute(params: TenantUpsertParams) {
    const tenant = await this.tenantRepository.create(params);

    await this.domainEventPublisher.publishAll([
      new TenantCreatedEvent(tenant.id, {
        name: tenant.name,
        slug: tenant.slug,
        isActive: tenant.isActive,
      }),
    ]);

    return tenant;
  }
}
